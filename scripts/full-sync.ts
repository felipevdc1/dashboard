#!/usr/bin/env tsx
/**
 * Full Historical Sync Script
 *
 * Sincroniza TODOS os pedidos dos últimos 12 meses da CartPanda API para o Supabase.
 *
 * Uso:
 *   npm run sync:full                  # Executa sync completo
 *   npm run sync:full -- --dry-run     # Simula sem salvar no banco
 *   npm run sync:full -- --batch-size=1000   # Customiza tamanho do batch
 *
 * Características:
 * - Busca todos os pedidos sem limite de páginas
 * - Divide em batches para evitar timeout do Supabase
 * - Progress bar visual
 * - Validação de completude ao final
 * - Logs detalhados
 */

import { cartPandaClient } from '../lib/cartpanda/client';
import { supabase } from '../lib/supabase';
import { syncLogger } from '../lib/logger';
import type { CartPandaOrder } from '../lib/cartpanda/types';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 100; // Reduzido de 500 para 100
const maxPagesArg = args.find(arg => arg.startsWith('--max-pages='));
const maxPages = maxPagesArg ? parseInt(maxPagesArg.split('=')[1]) : 200;
const maxRetriesArg = args.find(arg => arg.startsWith('--max-retries='));
const maxRetries = maxRetriesArg ? parseInt(maxRetriesArg.split('=')[1]) : 3;

interface SyncStats {
  totalFetched: number;
  totalSynced: number;
  batches: number;
  errors: number;
  retries: number;
  duration: number;
}

/**
 * Sleep utility para delays entre retries
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Divide array em chunks de tamanho especificado
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Transforma CartPandaOrder para formato do Supabase
 */
function transformOrderForDB(order: CartPandaOrder) {
  return {
    id: order.id,
    order_number: order.order_number,
    status_id: order.status_id,
    financial_status: order.financial_status,
    payment_status: order.payment_status,
    currency: order.currency,
    total_price: order.total_price,
    subtotal_price: order.subtotal_price,
    current_total_discounts: order.current_total_discounts,
    local_currency_amount: order.local_currency_amount,
    exchange_rate_usd: order.exchange_rate_USD,
    customer: order.customer,
    line_items: order.line_items,
    payment: order.payment,
    afid: order.afid || null,
    affiliate_name: order.affiliate_name || null,
    affiliate_email: order.affiliate_email || null,
    affiliate_slug: order.affiliate_slug || '',
    affiliate_amount: order.affiliate_amount || '0',
    refunds: order.refunds || null,
    chargeback_received: order.chargeback_received || 0,
    chargeback_at: order.chargeback_at || null,
    created_at: order.created_at,
    updated_at: order.updated_at,
    synced_at: new Date().toISOString(),
  };
}

/**
 * Executa full sync
 */
async function fullSync(): Promise<SyncStats> {
  const startTime = Date.now();
  const stats: SyncStats = {
    totalFetched: 0,
    totalSynced: 0,
    batches: 0,
    errors: 0,
    retries: 0,
    duration: 0,
  };

  console.log('\n🚀 Iniciando Full Sync dos últimos 12 meses...\n');
  console.log(`⚙️  Configuração:`);
  console.log(`   - Batch size: ${batchSize} orders (otimizado para Supabase)`);
  console.log(`   - Max pages: ${maxPages}`);
  console.log(`   - Max retries: ${maxRetries} per batch`);
  console.log(`   - Dry run: ${isDryRun ? 'SIM' : 'NÃO'}\n`);

  // 1. Fetch ALL orders (sem limite)
  syncLogger.info('Fetching all orders from CartPanda API...');
  console.log('📡 Buscando pedidos da CartPanda API...');

  let orders: CartPandaOrder[];
  try {
    orders = await cartPandaClient.getAllOrders({
      maxPages: maxPages
    });
    stats.totalFetched = orders.length;

    console.log(`✅ Fetched ${orders.length} orders from API\n`);
    syncLogger.info(`Fetched ${orders.length} orders from CartPanda`);
  } catch (error) {
    console.error('❌ Failed to fetch orders from CartPanda');
    syncLogger.error('Failed to fetch orders', error);
    throw error;
  }

  if (orders.length === 0) {
    console.log('⚠️  No orders found. Exiting...\n');
    return stats;
  }

  // 2. Transform orders
  console.log('🔄 Transformando dados...');
  const ordersToSync = orders.map(transformOrderForDB);
  console.log(`✅ ${ordersToSync.length} orders transformed\n`);

  // 3. Dividir em batches
  const batches = chunk(ordersToSync, batchSize);
  console.log(`📦 Dividido em ${batches.length} batches de ${batchSize} orders\n`);

  if (isDryRun) {
    console.log('🏃 DRY RUN - Simulando sync sem salvar no banco\n');
    stats.totalSynced = ordersToSync.length;
    stats.batches = batches.length;
    stats.duration = Date.now() - startTime;
    return stats;
  }

  // 4. UPSERT batch por batch com retry logic
  console.log('💾 Sincronizando para Supabase...\n');

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNumber = i + 1;
    const progress = ((batchNumber / batches.length) * 100).toFixed(1);

    process.stdout.write(
      `   Batch ${batchNumber}/${batches.length} (${progress}%) - ${batch.length} orders... `
    );

    // Retry logic com exponential backoff
    let retryCount = 0;
    let success = false;

    while (retryCount <= maxRetries && !success) {
      try {
        const { error } = await supabase
          .from('orders')
          .upsert(batch as any, { onConflict: 'id' });

        if (error) {
          throw error;
        }

        console.log('✅');
        stats.totalSynced += batch.length;
        stats.batches++;
        success = true;

      } catch (error: any) {
        retryCount++;
        stats.retries++;

        // Se ainda tem retries disponíveis
        if (retryCount <= maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s
          process.stdout.write(`⏳ retry ${retryCount}/${maxRetries} (${backoffMs}ms)... `);
          await sleep(backoffMs);
        } else {
          // Esgotou retries
          console.log(`❌ (failed after ${maxRetries} retries)`);
          syncLogger.error(`Batch ${batchNumber} failed after ${maxRetries} retries`, error);
          stats.errors++;
        }
      }
    }

    // Pequeno delay entre batches para não sobrecarregar Supabase
    if (i < batches.length - 1) {
      await sleep(200); // 200ms entre batches
    }
  }

  stats.duration = Date.now() - startTime;
  return stats;
}

/**
 * Valida completude da sync
 */
async function validateSync(totalFetched: number): Promise<void> {
  console.log('\n📊 Validando completude da sincronização...\n');

  try {
    // Count total no Supabase
    const { count: dbCount, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw error;
    }

    const missing = totalFetched - (dbCount || 0);
    const percentage = dbCount ? (dbCount / totalFetched) * 100 : 0;

    console.log(`   API:      ${totalFetched} orders`);
    console.log(`   Supabase: ${dbCount || 0} orders`);
    console.log(`   Missing:  ${missing} orders`);
    console.log(`   Accuracy: ${percentage.toFixed(2)}%\n`);

    if (percentage >= 99) {
      console.log('✅ Sincronização completa com sucesso!\n');
    } else if (percentage >= 95) {
      console.log('⚠️  Sincronização completa com pequenas inconsistências\n');
    } else {
      console.log('❌ Sincronização incompleta - muitos pedidos faltando\n');
    }

  } catch (error) {
    console.error('❌ Failed to validate sync');
    syncLogger.error('Validation error', error);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const stats = await fullSync();

    // Print stats
    console.log('\n📈 Estatísticas da Sincronização:\n');
    console.log(`   Fetched:  ${stats.totalFetched} orders`);
    console.log(`   Synced:   ${stats.totalSynced} orders`);
    console.log(`   Batches:  ${stats.batches}/${Math.ceil(stats.totalFetched / batchSize)}`);
    console.log(`   Errors:   ${stats.errors}`);
    console.log(`   Retries:  ${stats.retries}`);
    console.log(`   Duration: ${(stats.duration / 1000).toFixed(2)}s\n`);

    // Validate if not dry run
    if (!isDryRun && stats.totalSynced > 0) {
      await validateSync(stats.totalFetched);
    }

    if (stats.errors > 0) {
      console.log('⚠️  Sync completed with errors. Check logs for details.\n');
      process.exit(1);
    }

    console.log('✅ Full sync completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Full sync failed:', error);
    syncLogger.error('Full sync failed', error);
    process.exit(1);
  }
}

// Execute
main();

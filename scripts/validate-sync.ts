#!/usr/bin/env tsx
/**
 * Validation Script
 *
 * Compara os dados entre CartPanda API e Supabase para detectar inconsistências.
 *
 * Uso:
 *   npm run validate              # Valida e gera relatório
 *   npm run validate --autofix    # Valida e corrige automaticamente
 *
 * Verifica:
 * - Count total API vs Supabase
 * - Pedidos missing (na API mas não no DB)
 * - Pedidos desatualizados (updated_at diferente)
 */

import { cartPandaClient } from '../lib/cartpanda/client';
import { supabase } from '../lib/supabase';
import { syncLogger } from '../lib/logger';
import type { CartPandaOrder } from '../lib/cartpanda/types';

// Parse arguments
const args = process.argv.slice(2);
const autoFix = args.includes('--autofix');

interface ValidationReport {
  timestamp: string;
  counts: {
    api: number;
    database: number;
    difference: number;
  };
  inconsistencies: {
    missing: number;
    outdated: number;
  };
  accuracy: number;
  status: 'OK' | 'WARNING' | 'CRITICAL';
  fixed: boolean;
}

/**
 * Compara count total
 */
async function compareOrderCounts(): Promise<ValidationReport['counts']> {
  syncLogger.info('Comparing order counts...');

  // API count
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 200 });
  const apiCount = apiOrders.length;

  // Supabase count
  const { count: dbCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const difference = apiCount - (dbCount || 0);

  return {
    api: apiCount,
    database: dbCount || 0,
    difference,
  };
}

/**
 * Encontra pedidos missing (na API mas não no DB)
 */
async function findMissingOrders(): Promise<CartPandaOrder[]> {
  syncLogger.info('Finding missing orders...');

  // Buscar últimos 1000 pedidos da API
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 10 });
  const apiIds = apiOrders.map(o => o.id);

  // Verificar quais existem no Supabase
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id')
    .in('id', apiIds);

  const existingIdSet = new Set(((existingOrders || []) as any[]).map((o: any) => o.id));
  const missingIds = apiIds.filter(id => !existingIdSet.has(id));

  // Retornar detalhes dos missing
  const missing = apiOrders.filter(o => missingIds.includes(o.id));

  syncLogger.info(`Found ${missing.length} missing orders`);
  return missing;
}

/**
 * Encontra pedidos desatualizados (updated_at diferente)
 */
async function findOutdatedOrders(): Promise<CartPandaOrder[]> {
  syncLogger.info('Finding outdated orders...');

  // Buscar últimos 500 pedidos da API
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 5 });
  const apiIds = apiOrders.map(o => o.id);

  // Buscar mesmos pedidos do Supabase
  const { data: dbOrders } = await supabase
    .from('orders')
    .select('id, updated_at')
    .in('id', apiIds);

  const dbOrdersMap = new Map(((dbOrders || []) as any[]).map((o: any) => [o.id, o.updated_at]));

  // Comparar updated_at
  const outdated = apiOrders.filter(apiOrder => {
    const dbUpdatedAt = dbOrdersMap.get(apiOrder.id);
    if (!dbUpdatedAt) return false; // Missing, não outdated

    return new Date(apiOrder.updated_at) > new Date(dbUpdatedAt);
  });

  syncLogger.info(`Found ${outdated.length} outdated orders`);
  return outdated;
}

/**
 * Corrige pedidos missing
 */
async function fixMissingOrders(missing: CartPandaOrder[]): Promise<number> {
  if (missing.length === 0) return 0;

  syncLogger.info(`Fixing ${missing.length} missing orders...`);

  const ordersToInsert = missing.map(order => ({
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
  }));

  const { error } = await supabase
    .from('orders')
    .upsert(ordersToInsert as any, { onConflict: 'id' });

  if (error) {
    syncLogger.error('Failed to fix missing orders', error);
    throw error;
  }

  syncLogger.info(`Fixed ${missing.length} missing orders`);
  return missing.length;
}

/**
 * Corrige pedidos desatualizados
 */
async function fixOutdatedOrders(outdated: CartPandaOrder[]): Promise<number> {
  if (outdated.length === 0) return 0;

  syncLogger.info(`Fixing ${outdated.length} outdated orders...`);

  const ordersToUpdate = outdated.map(order => ({
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
  }));

  const { error } = await supabase
    .from('orders')
    .upsert(ordersToUpdate as any, { onConflict: 'id' });

  if (error) {
    syncLogger.error('Failed to fix outdated orders', error);
    throw error;
  }

  syncLogger.info(`Fixed ${outdated.length} outdated orders`);
  return outdated.length;
}

/**
 * Executa validação completa
 */
async function validate(): Promise<ValidationReport> {
  console.log('\n📊 Validando integridade dos dados...\n');

  const startTime = Date.now();

  // 1. Comparar counts
  console.log('1️⃣  Comparando totais...');
  const counts = await compareOrderCounts();
  console.log(`   API:      ${counts.api} orders`);
  console.log(`   Supabase: ${counts.database} orders`);
  console.log(`   Diff:     ${counts.difference} orders\n`);

  // 2. Encontrar missing
  console.log('2️⃣  Procurando pedidos missing...');
  const missing = await findMissingOrders();
  console.log(`   Missing:  ${missing.length} orders\n`);

  // 3. Encontrar outdated
  console.log('3️⃣  Procurando pedidos desatualizados...');
  const outdated = await findOutdatedOrders();
  console.log(`   Outdated: ${outdated.length} orders\n`);

  // 4. Auto-fix se solicitado
  let fixed = false;
  if (autoFix && (missing.length > 0 || outdated.length > 0)) {
    console.log('4️⃣  Corrigindo inconsistências...\n');

    if (missing.length > 0) {
      await fixMissingOrders(missing);
      console.log(`   ✅ Fixed ${missing.length} missing orders`);
    }

    if (outdated.length > 0) {
      await fixOutdatedOrders(outdated);
      console.log(`   ✅ Fixed ${outdated.length} outdated orders`);
    }

    fixed = true;
    console.log();
  }

  // 5. Calcular accuracy
  const accuracy = counts.database > 0
    ? (counts.database / counts.api) * 100
    : 0;

  // 6. Determinar status
  let status: 'OK' | 'WARNING' | 'CRITICAL';
  if (accuracy >= 99 && missing.length === 0) {
    status = 'OK';
  } else if (accuracy >= 95 || missing.length < 50) {
    status = 'WARNING';
  } else {
    status = 'CRITICAL';
  }

  const duration = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    counts,
    inconsistencies: {
      missing: missing.length,
      outdated: outdated.length,
    },
    accuracy: parseFloat(accuracy.toFixed(2)),
    status,
    fixed,
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    const report = await validate();

    // Print report
    console.log('📋 RELATÓRIO DE VALIDAÇÃO\n');
    console.log(`   Timestamp: ${report.timestamp}`);
    console.log(`   Status:    ${report.status}`);
    console.log(`   Accuracy:  ${report.accuracy}%`);
    console.log(`   Missing:   ${report.inconsistencies.missing}`);
    console.log(`   Outdated:  ${report.inconsistencies.outdated}`);
    console.log(`   Fixed:     ${report.fixed ? 'SIM' : 'NÃO'}\n`);

    // Status icon
    const statusIcon = {
      'OK': '✅',
      'WARNING': '⚠️',
      'CRITICAL': '❌'
    }[report.status];

    console.log(`${statusIcon} Validação concluída com status: ${report.status}\n`);

    // Exit code baseado no status
    if (report.status === 'CRITICAL') {
      process.exit(1);
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Validation failed:', error);
    syncLogger.error('Validation failed', error);
    process.exit(1);
  }
}

// Execute
main();

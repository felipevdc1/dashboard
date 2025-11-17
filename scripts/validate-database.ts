#!/usr/bin/env tsx

/**
 * Database Validation Script
 *
 * Verifica a integridade dos dados no Supabase
 */

import { supabase } from '../lib/supabase';

async function validateDatabase() {
  console.log('🔍 Verificando integridade do banco de dados...\n');

  try {
    // 1. Total de pedidos
    const { count: totalOrders, error: e1 } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (e1) throw e1;

    console.log('📊 TOTAL DE PEDIDOS:', totalOrders);

    // 2. Verificar duplicados por ID
    const { data: orderIds, error: e2 } = await supabase
      .from('orders')
      .select('id');

    if (e2) throw e2;

    const ids = (orderIds || []).map((o: any) => o.id);
    const uniqueIds = new Set(ids);
    const duplicateCount = ids.length - uniqueIds.size;

    console.log('🔑 IDs únicos:', uniqueIds.size);
    console.log('🔑 Total IDs:', ids.length);
    console.log('✅ Duplicados encontrados:', duplicateCount, duplicateCount > 0 ? '⚠️ ATENÇÃO!' : '✅ OK');

    // 3. Pedidos por status
    const { data: byStatus, error: e3 } = await supabase
      .from('orders')
      .select('financial_status');

    if (e3) throw e3;

    const statusCounts: Record<number, number> = {};
    (byStatus || []).forEach((o: any) => {
      statusCounts[o.financial_status] = (statusCounts[o.financial_status] || 0) + 1;
    });

    console.log('\n📈 PEDIDOS POR STATUS:');
    console.log('  Status 3 (Paid):', statusCounts[3] || 0);
    console.log('  Status 4 (Refunded):', statusCounts[4] || 0);
    console.log('  Outros:', Object.keys(statusCounts)
      .filter(k => k !== '3' && k !== '4')
      .reduce((sum, k) => sum + statusCounts[Number(k)], 0));

    // 4. Range de datas
    const { data: firstOrder, error: e4 } = await supabase
      .from('orders')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    const { data: lastOrder, error: e5 } = await supabase
      .from('orders')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (e4 || e5) throw e4 || e5;

    console.log('\n📅 PERÍODO DOS PEDIDOS:');
    console.log('  Primeiro pedido:', (firstOrder as any)?.[0]?.created_at?.split('T')[0]);
    console.log('  Último pedido:', (lastOrder as any)?.[0]?.created_at?.split('T')[0]);

    // 5. Última sincronização
    const { data: lastSync, error: e6 } = await supabase
      .from('orders')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1);

    if (e6) throw e6;

    const syncDate = new Date((lastSync as any)?.[0]?.synced_at);
    const hoursAgo = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);

    console.log('\n⏱️  ÚLTIMA SINCRONIZAÇÃO:');
    console.log('  Data/Hora:', syncDate.toLocaleString('pt-BR'));
    console.log('  Há quantas horas:', hoursAgo.toFixed(1), 'horas');
    console.log('  Status:', hoursAgo < 1 ? '✅ Recente' : hoursAgo < 24 ? '⚠️  Mais de 1h' : '❌ Antiga (>24h)');

    // 6. Verificar integridade dos JSONBs
    const { data: nullCustomers, error: e7 } = await supabase
      .from('orders')
      .select('id')
      .is('customer', null);

    const { data: nullItems, error: e8 } = await supabase
      .from('orders')
      .select('id')
      .is('line_items', null);

    if (e7 || e8) throw e7 || e8;

    console.log('\n🛡️  INTEGRIDADE DOS DADOS:');
    console.log('  Pedidos sem customer:', (nullCustomers || []).length, (nullCustomers || []).length ? '⚠️' : '✅');
    console.log('  Pedidos sem line_items:', (nullItems || []).length, (nullItems || []).length ? '⚠️' : '✅');

    // 7. Amostra de dados
    const { data: sample, error: e9 } = await supabase
      .from('orders')
      .select('id, order_number, total_price, customer, line_items')
      .order('created_at', { ascending: false })
      .limit(3);

    if (e9) throw e9;

    console.log('\n🔬 AMOSTRA DE DADOS (3 pedidos mais recentes):');
    (sample || []).forEach((order: any, i: number) => {
      console.log(`  [${i+1}] Order #${order.order_number}`);
      console.log(`      ID: ${order.id}`);
      console.log(`      Total: R$ ${order.total_price}`);
      console.log(`      Cliente: ${order.customer?.email || 'N/A'}`);
      console.log(`      Items: ${order.line_items?.length || 0}`);
    });

    // 8. Resumo final
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMO DA VALIDAÇÃO');
    console.log('='.repeat(50));

    const issues: string[] = [];

    if (duplicateCount > 0) {
      issues.push(`⚠️  ${duplicateCount} IDs duplicados encontrados`);
    }

    if ((nullCustomers || []).length > 0) {
      issues.push(`⚠️  ${(nullCustomers || []).length} pedidos sem customer`);
    }

    if ((nullItems || []).length > 0) {
      issues.push(`⚠️  ${(nullItems || []).length} pedidos sem line_items`);
    }

    if (hoursAgo > 24) {
      issues.push(`⚠️  Última sync há ${hoursAgo.toFixed(1)} horas (>24h)`);
    }

    if (issues.length === 0) {
      console.log('✅ BANCO 100% ÍNTEGRO!');
      console.log(`   ${totalOrders} pedidos validados sem problemas`);
    } else {
      console.log('⚠️  PROBLEMAS ENCONTRADOS:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    console.log('='.repeat(50));

  } catch (error: any) {
    console.error('\n❌ ERRO NA VALIDAÇÃO:', error.message);
    throw error;
  }
}

// Run
validateDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

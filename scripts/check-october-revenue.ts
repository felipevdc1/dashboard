import { createClient } from '@supabase/supabase-js';
import { parsePrice } from '../lib/shared/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkOctoberRevenue() {
  // Get all October 2025 orders with pagination (Supabase has 1000 record limit)
  let octoberOrders: any[] = [];
  let rangeStart = 0;
  const rangeSize = 1000;
  let hasMore = true;

  console.log('🔍 Buscando pedidos de Outubro com paginação...');

  while (hasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('total_price, financial_status, payment_status, refunds, chargeback_received')
      .gte('created_at', '2025-10-01T00:00:00-03:00')
      .lte('created_at', '2025-10-31T23:59:59-03:00')
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeStart + rangeSize - 1);

    if (error) {
      console.error('Erro na query:', error);
      break;
    }

    if (data && data.length > 0) {
      octoberOrders = octoberOrders.concat(data);
      rangeStart += rangeSize;
      hasMore = data.length === rangeSize;
      console.log(`  ✅ Página ${Math.ceil(rangeStart / rangeSize)}: ${data.length} pedidos (total: ${octoberOrders.length})`);
    } else {
      hasMore = false;
    }
  }

  console.log(`\n📊 Análise de Outubro 2025:\n`);
  console.log(`Total de pedidos: ${octoberOrders.length}`);

  if (!octoberOrders || octoberOrders.length === 0) return;

  // Calculate paid revenue (financial_status = 3)
  let paidRevenue = 0;
  let paidCount = 0;
  let refundedRevenue = 0;
  let refundedCount = 0;
  let chargebackRevenue = 0;
  let chargebackCount = 0;
  let pendingRevenue = 0;
  let pendingCount = 0;

  octoberOrders.forEach(order => {
    const price = parsePrice(order.total_price || '0');

    // Check if refunded
    if (order.refunds && order.refunds.length > 0) {
      refundedRevenue += price;
      refundedCount++;
      return;
    }

    // Check if chargeback
    if (order.chargeback_received === 1) {
      chargebackRevenue += price;
      chargebackCount++;
      return;
    }

    // Check if paid
    if (order.financial_status === 3) {
      paidRevenue += price;
      paidCount++;
    } else {
      pendingRevenue += price;
      pendingCount++;
    }
  });

  const netRevenue = paidRevenue - refundedRevenue - chargebackRevenue;

  console.log(`\n💰 Receita Bruta (Paid): R$ ${paidRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${paidCount} pedidos)`);
  console.log(`❌ Reembolsos: R$ ${refundedRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${refundedCount} pedidos)`);
  console.log(`⚠️  Chargebacks: R$ ${chargebackRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${chargebackCount} pedidos)`);
  console.log(`⏳ Pendentes: R$ ${pendingRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (${pendingCount} pedidos)`);
  console.log(`\n✅ Receita Líquida (net): R$ ${netRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
  console.log(`\n🎯 Diferença para R$ 4.256.562,79: R$ ${(4256562.79 - paidRevenue).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`);
}

checkOctoberRevenue().catch(console.error);

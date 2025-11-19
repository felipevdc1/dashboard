/**
 * Script para investigar a estrutura do array refunds
 *
 * Busca pedidos com refunds e analisa a estrutura JSON retornada
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateRefunds() {
  console.log('🔍 Investigando estrutura de refunds...\n');

  // Buscar pedidos com refunds
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, refunds, total_price, updated_at')
    .not('refunds', 'is', null)
    .limit(10);

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  if (!orders || orders.length === 0) {
    console.log('⚠️ Nenhum pedido com refunds encontrado');
    return;
  }

  console.log(`✅ Encontrados ${orders.length} pedidos com refunds\n`);

  orders.forEach((order, index) => {
    console.log(`\n━━━ PEDIDO #${index + 1} ━━━`);
    console.log(`Order ID: ${order.id}`);
    console.log(`Order Number: ${order.order_number}`);
    console.log(`Total Price: ${order.total_price}`);
    console.log(`Updated At: ${order.updated_at}`);
    console.log(`\nRefunds Structure:`);
    console.log(JSON.stringify(order.refunds, null, 2));
    console.log(`\nRefunds Type: ${typeof order.refunds}`);
    console.log(`Is Array: ${Array.isArray(order.refunds)}`);
    if (Array.isArray(order.refunds)) {
      console.log(`Array Length: ${order.refunds.length}`);
      if (order.refunds.length > 0) {
        console.log(`First Item Keys: ${Object.keys(order.refunds[0]).join(', ')}`);
      }
    }
  });

  console.log('\n\n📊 RESUMO DA INVESTIGAÇÃO:\n');
  const hasDateField = orders.some(o =>
    Array.isArray(o.refunds) &&
    o.refunds.length > 0 &&
    (o.refunds[0].date || o.refunds[0].created_at || o.refunds[0].refund_date)
  );
  const hasAmountField = orders.some(o =>
    Array.isArray(o.refunds) &&
    o.refunds.length > 0 &&
    (o.refunds[0].amount || o.refunds[0].refund_amount || o.refunds[0].total)
  );

  console.log(`✓ Tem campo de data: ${hasDateField ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`✓ Tem campo de valor: ${hasAmountField ? '✅ SIM' : '❌ NÃO'}`);
}

investigateRefunds().catch(console.error);

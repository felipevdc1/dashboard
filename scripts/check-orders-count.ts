import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkOrders() {
  // Get total count
  const { count: totalCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total de pedidos no Supabase: ${totalCount}\n`);

  // Get October orders count
  const { count: octoberCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2025-10-01T00:00:00-03:00')
    .lte('created_at', '2025-10-31T23:59:59-03:00');

  console.log(`📅 Pedidos de Outubro 2025: ${octoberCount}`);

  // Get November orders count
  const { count: novemberCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', '2025-11-01T00:00:00-03:00')
    .lte('created_at', '2025-11-30T23:59:59-03:00');

  console.log(`📅 Pedidos de Novembro 2025: ${novemberCount}\n`);

  // Get sample of October orders
  const { data: octoberOrders } = await supabase
    .from('orders')
    .select('id, created_at, total_price, financial_status')
    .gte('created_at', '2025-10-01T00:00:00-03:00')
    .lte('created_at', '2025-10-31T23:59:59-03:00')
    .limit(5)
    .order('created_at', { ascending: false });

  console.log('🔍 Amostra de pedidos de Outubro (mais recentes):');
  octoberOrders?.forEach(order => {
    console.log(`  - ID: ${order.id}, Data: ${order.created_at}, Valor: R$ ${order.total_price}, Status: ${order.financial_status}`);
  });
}

checkOrders().catch(console.error);

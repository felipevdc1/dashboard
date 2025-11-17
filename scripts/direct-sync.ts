#!/usr/bin/env tsx
/**
 * Direct sync script - Loads all CartPanda orders into Supabase
 * This script bypasses the Next.js API and calls CartPanda + Supabase directly
 * Run with: npx tsx scripts/direct-sync.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// IMPORTANT: Load environment variables BEFORE importing other modules
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { cartPandaClient } from '../lib/cartpanda/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDirectSync() {
  console.log('🚀 Starting direct sync from CartPanda to Supabase...\n');

  try {
    // Check current database status
    console.log('📊 Checking current database status...');
    const { count: currentCount, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    console.log(`   Current database records: ${currentCount || 0}\n`);

    // Fetch all orders from CartPanda
    console.log('📡 Fetching orders from CartPanda API...');
    const startTime = Date.now();
    const orders = await cartPandaClient.getAllOrders();
    const fetchDuration = Date.now() - startTime;

    console.log(`\n✅ Fetched ${orders.length} orders in ${Math.round(fetchDuration / 1000)}s`);

    if (orders.length === 0) {
      console.log('⚠️  No orders to sync');
      return;
    }

    // Transform orders for Supabase
    console.log('\n💾 Preparing data for Supabase...');
    const ordersToSync = orders.map(order => ({
      id: order.id,
      order_number: order.order_number,
      status_id: order.status_id,
      financial_status: order.financial_status,
      payment_status: order.payment_status,
      currency: order.currency || 'USD',
      total_price: order.total_price || '0',
      subtotal_price: order.subtotal_price || '0',
      current_total_discounts: order.current_total_discounts || '0',
      local_currency_amount: order.local_currency_amount || '0',
      exchange_rate_usd: order.exchange_rate_USD || '1.00',
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

    console.log('💾 Upserting to Supabase...');
    const syncStartTime = Date.now();

    // Use upsert (INSERT ... ON CONFLICT UPDATE) for efficient sync
    const { data, error, count } = await supabase
      .from('orders')
      .upsert(ordersToSync, {
        onConflict: 'id', // Update if order ID already exists
        count: 'exact',
      });

    if (error) {
      console.error('❌ Supabase sync error:', error);
      throw error;
    }

    const syncDuration = Date.now() - syncStartTime;
    const totalDuration = Date.now() - startTime;

    console.log('\n✅ Sync completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Orders fetched:       ${orders.length}`);
    console.log(`   Orders synced:        ${count || ordersToSync.length}`);
    console.log(`   Fetch duration:       ${Math.round(fetchDuration / 1000)}s`);
    console.log(`   Sync duration:        ${Math.round(syncDuration / 1000)}s`);
    console.log(`   Total duration:       ${Math.round(totalDuration / 1000)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verify final status
    console.log('\n📊 Verifying final database status...');
    const { count: finalCount, error: finalCountError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (finalCountError) throw finalCountError;

    const { data: lastSync, error: lastSyncError } = await supabase
      .from('orders')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSyncError && lastSyncError.code !== 'PGRST116') throw lastSyncError;

    console.log(`   ✅ Total records in database: ${finalCount || 0}`);
    console.log(`   ✅ Last sync: ${lastSync?.synced_at || 'Unknown'}`);

    console.log('\n🎉 Initial sync complete! Your dashboard now uses Supabase for data.');
    console.log('💡 Tip: Set up a cron job to run this sync periodically');

  } catch (error) {
    console.error('\n❌ Sync failed with error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
    process.exit(1);
  }
}

// Run the sync
runDirectSync()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

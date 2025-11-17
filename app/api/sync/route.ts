import { NextResponse } from 'next/server';
import { cartPandaClient } from '@/lib/cartpanda/client';
import { supabase } from '@/lib/supabase';
import { syncLogger, logger } from '@/lib/logger';

// Force dynamic to prevent caching (sync should always be fresh)
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    syncLogger.info('Starting CartPanda sync...');

    // Fetch all orders from CartPanda API
    syncLogger.debug('Fetching orders from CartPanda...');
    const orders = await cartPandaClient.getAllOrders();
    syncLogger.info(`Fetched ${orders.length} orders from CartPanda`);

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to sync',
        stats: {
          fetched: 0,
          inserted: 0,
          updated: 0,
          errors: 0,
        },
        duration: Date.now() - startTime,
      });
    }

    // Prepare data for Supabase (transform CartPanda format to our schema)
    const ordersToSync = orders.map(order => ({
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

    syncLogger.debug('Syncing to Supabase...');

    // Use upsert (INSERT ... ON CONFLICT UPDATE) for efficient sync
    const { data, error, count } = await supabase
      .from('orders')
      .upsert(ordersToSync as any, {
        onConflict: 'id', // Update if order ID already exists
        count: 'exact',
      });

    if (error) {
      syncLogger.error('Supabase sync error', error);
      throw error;
    }

    const duration = Date.now() - startTime;
    syncLogger.info(`Sync completed in ${duration}ms`);
    syncLogger.info(`Synced ${count || ordersToSync.length} orders`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      stats: {
        fetched: orders.length,
        synced: count || ordersToSync.length,
        duration,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    syncLogger.error('Sync error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET() {
  try {
    // Get total count and last sync time from Supabase
    const { count: totalOrders, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get last sync time (most recent synced_at)
    const { data: lastSyncData, error: syncError } = await supabase
      .from('orders')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      // PGRST116 = no rows, which is OK for empty table
      throw syncError;
    }

    return NextResponse.json({
      success: true,
      status: {
        totalOrders: totalOrders || 0,
        lastSyncAt: (lastSyncData as any)?.synced_at || null,
        databaseConnected: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    syncLogger.error('Status check error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check sync status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

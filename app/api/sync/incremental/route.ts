import { NextRequest, NextResponse } from 'next/server';
import { cartPandaClient } from '@/lib/cartpanda/client';
import { supabase } from '@/lib/supabase';
import { syncLogger } from '@/lib/logger';
import type { CartPandaOrder } from '@/lib/cartpanda/types';

// Force dynamic to prevent caching (sync should always be fresh)
export const dynamic = 'force-dynamic';

/**
 * Transform CartPandaOrder for database insert
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
    exchange_rate_usd: order.exchange_rate_USD || null,
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
 * Get date range for incremental sync
 */
function getDateRange(hours: number): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

  // Format as YYYY-MM-DD
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(start),
    endDate: formatDate(now),
  };
}

/**
 * POST /api/sync/incremental
 *
 * Syncs only recent orders (last 24 hours by default)
 * Much faster than full sync - perfect for manual refreshes
 *
 * Query params:
 * - hours: number of hours to look back (default: 24)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get hours parameter from query string (default 24h)
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);

    syncLogger.info(`Starting incremental sync (last ${hours} hours)...`);

    // Get date range
    const { startDate, endDate } = getDateRange(hours);
    syncLogger.info(`Date range: ${startDate} to ${endDate}`);

    // Fetch recent orders from CartPanda
    syncLogger.debug('Fetching recent orders from CartPanda API...');
    const orders = await cartPandaClient.getAllOrders({
      start_date: startDate,
      end_date: endDate,
      maxPages: 20, // Recent orders should fit in ~20 pages
    });

    syncLogger.info(`Found ${orders.length} orders in API`);

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to sync',
        stats: {
          fetched: 0,
          synced: 0,
          duration: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check which orders already exist in database
    const orderIds = orders.map((o) => o.id);
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id, updated_at')
      .in('id', orderIds);

    const existingMap = new Map(
      ((existingOrders || []) as any[]).map((o: any) => [o.id, o.updated_at])
    );

    // Filter to only new/updated orders
    const ordersToSync = orders.filter((order) => {
      const existingUpdatedAt = existingMap.get(order.id);

      // New order
      if (!existingUpdatedAt) return true;

      // Updated order
      return new Date(order.updated_at) > new Date(existingUpdatedAt);
    });

    syncLogger.info(`${ordersToSync.length} orders need sync (new or updated)`);

    if (ordersToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All orders are already up to date',
        stats: {
          fetched: orders.length,
          synced: 0,
          duration: Date.now() - startTime,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Transform orders for database
    const ordersToInsert = ordersToSync.map(transformOrderForDB);

    // Sync to Supabase in batches
    const BATCH_SIZE = 100;
    let syncedCount = 0;

    for (let i = 0; i < ordersToInsert.length; i += BATCH_SIZE) {
      const batch = ordersToInsert.slice(i, i + BATCH_SIZE);

      syncLogger.debug(
        `Syncing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
          ordersToInsert.length / BATCH_SIZE
        )} (${batch.length} orders)...`
      );

      const { error } = await supabase
        .from('orders')
        .upsert(batch as any, { onConflict: 'id' });

      if (error) {
        syncLogger.error('Batch sync failed', error);
        throw error;
      }

      syncedCount += batch.length;
    }

    const duration = Date.now() - startTime;
    const durationSeconds = (duration / 1000).toFixed(1);

    syncLogger.info(`Incremental sync complete!`);
    syncLogger.info(`Synced: ${syncedCount} orders in ${durationSeconds}s`);

    return NextResponse.json({
      success: true,
      message: `Incremental sync completed successfully`,
      stats: {
        fetched: orders.length,
        synced: syncedCount,
        duration,
        durationSeconds: parseFloat(durationSeconds),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    syncLogger.error('Incremental sync error', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run incremental sync',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

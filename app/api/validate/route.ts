import { NextRequest, NextResponse } from 'next/server';
import { cartPandaClient } from '@/lib/cartpanda/client';
import { supabase } from '@/lib/supabase';
import { syncLogger } from '@/lib/logger';
import type { CartPandaOrder } from '@/lib/cartpanda/types';

/**
 * Validation API Route
 *
 * Compares CartPanda API data with Supabase to detect inconsistencies
 * Can auto-fix issues if requested
 *
 * Usage:
 *   GET /api/validate              - Run validation only
 *   GET /api/validate?autofix=true - Run validation and fix issues
 */

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
  duration: number;
}

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
 * Compare order counts
 */
async function compareOrderCounts(): Promise<ValidationReport['counts']> {
  syncLogger.info('Comparing order counts...');

  // Get count from API (recent orders for quick validation)
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 50 });
  const apiCount = apiOrders.length;

  // Get count from Supabase
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
 * Find missing orders (in API but not in DB)
 */
async function findMissingOrders(): Promise<CartPandaOrder[]> {
  syncLogger.info('Finding missing orders...');

  // Get recent orders from API
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 10 });
  const apiIds = apiOrders.map(o => o.id);

  // Check which exist in Supabase
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id')
    .in('id', apiIds);

  const existingIdSet = new Set(((existingOrders || []) as any[]).map((o: any) => o.id));
  const missingIds = apiIds.filter(id => !existingIdSet.has(id));

  // Return details of missing orders
  const missing = apiOrders.filter(o => missingIds.includes(o.id));

  syncLogger.info(`Found ${missing.length} missing orders`);
  return missing;
}

/**
 * Find outdated orders (updated_at different)
 */
async function findOutdatedOrders(): Promise<CartPandaOrder[]> {
  syncLogger.info('Finding outdated orders...');

  // Get recent orders from API
  const apiOrders = await cartPandaClient.getAllOrders({ maxPages: 5 });
  const apiIds = apiOrders.map(o => o.id);

  // Get same orders from Supabase
  const { data: dbOrders } = await supabase
    .from('orders')
    .select('id, updated_at')
    .in('id', apiIds);

  const dbOrdersMap = new Map(((dbOrders || []) as any[]).map((o: any) => [o.id, o.updated_at]));

  // Compare updated_at
  const outdated = apiOrders.filter(apiOrder => {
    const dbUpdatedAt = dbOrdersMap.get(apiOrder.id);
    if (!dbUpdatedAt) return false; // Missing, not outdated

    return new Date(apiOrder.updated_at) > new Date(dbUpdatedAt);
  });

  syncLogger.info(`Found ${outdated.length} outdated orders`);
  return outdated;
}

/**
 * Fix missing orders
 */
async function fixMissingOrders(missing: CartPandaOrder[]): Promise<number> {
  if (missing.length === 0) return 0;

  syncLogger.info(`Fixing ${missing.length} missing orders...`);

  const ordersToInsert = missing.map(transformOrderForDB);

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
 * Fix outdated orders
 */
async function fixOutdatedOrders(outdated: CartPandaOrder[]): Promise<number> {
  if (outdated.length === 0) return 0;

  syncLogger.info(`Fixing ${outdated.length} outdated orders...`);

  const ordersToUpdate = outdated.map(transformOrderForDB);

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
 * Log validation to Supabase
 */
async function logValidation(report: ValidationReport): Promise<void> {
  try {
    await (supabase as any)
      .from('validation_logs')
      .insert({
        timestamp: report.timestamp,
        api_count: report.counts.api,
        db_count: report.counts.database,
        missing_count: report.inconsistencies.missing,
        outdated_count: report.inconsistencies.outdated,
        accuracy: report.accuracy,
        status: report.status,
        fixed: report.fixed,
        duration_ms: report.duration,
      });
  } catch (error) {
    // Non-critical error, just log it
    syncLogger.error('Failed to log validation', error);
  }
}

/**
 * Run validation
 */
async function runValidation(autoFix: boolean): Promise<ValidationReport> {
  const startTime = Date.now();

  syncLogger.info('Starting validation...');

  // 1. Compare counts
  const counts = await compareOrderCounts();

  // 2. Find missing orders
  const missing = await findMissingOrders();

  // 3. Find outdated orders
  const outdated = await findOutdatedOrders();

  // 4. Auto-fix if requested
  let fixed = false;
  if (autoFix && (missing.length > 0 || outdated.length > 0)) {
    syncLogger.info('Auto-fixing inconsistencies...');

    if (missing.length > 0) {
      await fixMissingOrders(missing);
    }

    if (outdated.length > 0) {
      await fixOutdatedOrders(outdated);
    }

    fixed = true;
  }

  // 5. Calculate accuracy
  const accuracy = counts.database > 0
    ? (counts.database / counts.api) * 100
    : 0;

  // 6. Determine status
  let status: 'OK' | 'WARNING' | 'CRITICAL';
  if (accuracy >= 99 && missing.length === 0) {
    status = 'OK';
  } else if (accuracy >= 95 || missing.length < 50) {
    status = 'WARNING';
  } else {
    status = 'CRITICAL';
  }

  const duration = Date.now() - startTime;

  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    counts,
    inconsistencies: {
      missing: missing.length,
      outdated: outdated.length,
    },
    accuracy: parseFloat(accuracy.toFixed(2)),
    status,
    fixed,
    duration,
  };

  // Log to Supabase
  await logValidation(report);

  syncLogger.info('Validation complete', report);

  return report;
}

/**
 * GET handler
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const autoFix = searchParams.get('autofix') === 'true';

    const report = await runValidation(autoFix);

    // Return appropriate status code based on validation result
    const statusCode = report.status === 'OK' ? 200 : report.status === 'WARNING' ? 207 : 500;

    return NextResponse.json(report, { status: statusCode });
  } catch (error) {
    syncLogger.error('Validation failed', error);

    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

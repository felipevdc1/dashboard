/**
 * GET /api/affiliates/[id]
 *
 * Returns detailed information for a specific affiliate
 */

import { NextRequest, NextResponse } from 'next/server';
import { cartPandaClient } from '@/lib/cartpanda/client';
import { supabase } from '@/lib/supabase';
import { memoryCache } from '@/lib/cache';
import {
  processAffiliateMetrics,
  buildAffiliateTimeline,
  buildProductBreakdown,
  buildActivityHeatmap,
} from '@/lib/affiliates/utils';
import { affiliateLogger, cacheLogger, logger } from '@/lib/logger';
import type { AffiliateDetails, AffiliateMonthlyMetrics, AffiliateAnalyticsResponse, AffiliateOrderItem } from '@/lib/affiliates/types';
import { parsePrice, isOrderPaid, extractLocalDate } from '@/lib/cartpanda/utils';
import { calculateRevenue } from '@/lib/shared/utils';
import type { CartPandaOrder } from '@/lib/cartpanda/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    const affiliateId = id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const includeOrders = searchParams.get('include_orders') === 'true'; // New parameter for analytics page
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Create cache key
    const cacheKey = `affiliate:${affiliateId}:${startDate}:${endDate}:${includeOrders}:${page}`;

    // Check cache
    const cached = includeOrders
      ? memoryCache.get<AffiliateAnalyticsResponse>(cacheKey)
      : memoryCache.get<AffiliateDetails>(cacheKey);

    if (cached) {
      cacheLogger.debug(`Cache HIT for affiliate details`, { affiliateId });
      return NextResponse.json({
        ...cached,
        _meta: {
          cached: true,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      });
    }

    cacheLogger.debug(`Cache MISS for affiliate details`, { affiliateId });

    // Fetch orders from Supabase (faster than CartPanda API)
    let query = supabase
      .from('orders')
      .select('*')
      .or(`affiliate_email.eq.${affiliateId},affiliate_slug.eq.${affiliateId},afid.eq.${affiliateId}`);

    // Apply date filter if provided
    if (startDate && endDate) {
      query = query
        .gte('created_at', `${startDate}T00:00:00-03:00`)
        .lte('created_at', `${endDate}T23:59:59-03:00`);
    }

    query = query.order('created_at', { ascending: false });

    const { data: affiliateOrders, error } = await query;

    if (error) {
      affiliateLogger.error('Error fetching orders from Supabase', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }

    if (!affiliateOrders || affiliateOrders.length === 0) {
      return NextResponse.json(
        {
          error: 'Affiliate not found',
          message: `No orders found for affiliate ${affiliateId}`,
        },
        { status: 404 }
      );
    }

    affiliateLogger.debug(`Found ${affiliateOrders.length} orders for affiliate`, { affiliateId });

    // Process basic metrics
    const affiliateMap = processAffiliateMetrics(affiliateOrders, {
      startDate: startDate || '',
      endDate: endDate || '',
    });

    const baseMetrics = affiliateMap.get(affiliateId);
    if (!baseMetrics) {
      return NextResponse.json(
        {
          error: 'Failed to process affiliate metrics',
          message: 'Could not calculate metrics for this affiliate',
        },
        { status: 500 }
      );
    }

    // Build timeline
    const timeline = buildAffiliateTimeline(affiliateOrders);

    // Build product breakdown
    const productBreakdown = buildProductBreakdown(affiliateOrders);

    // Build activity heatmap
    const activityHeatmap = buildActivityHeatmap(affiliateOrders);

    // Build monthly performance
    const monthlyPerformance = buildMonthlyPerformance(affiliateOrders);

    const details: AffiliateDetails = {
      ...baseMetrics,
      timeline,
      productBreakdown,
      activityHeatmap,
      monthlyPerformance,
    };

    const duration = Date.now() - startTime;

    // If include_orders is true, return analytics response with orders list
    if (includeOrders) {
      // Calculate summary stats
      const paidOrders = affiliateOrders.filter((o: any) => o.financial_status === 3);
      const refundedOrders = affiliateOrders.filter((o: any) => o.refunds && o.refunds.length > 0);
      const chargebackOrders = affiliateOrders.filter((o: any) => o.chargeback_received === 1);
      const pendingOrders = affiliateOrders.filter((o: any) => o.financial_status !== 3 && (!o.refunds || o.refunds.length === 0) && o.chargeback_received !== 1);

      const summary = {
        total: affiliateOrders.length,
        paid: paidOrders.length,
        refunded: refundedOrders.length,
        chargebacks: chargebackOrders.length,
        pending: pendingOrders.length,
        revenue: calculateRevenue(affiliateOrders),
        commission: affiliateOrders.reduce((sum: number, o: any) => {
          // Skip refunded and chargeback orders for commission too
          if ((o.refunds && o.refunds.length > 0) || o.chargeback_received === 1) {
            return sum;
          }
          if (isOrderPaid(o)) {
            return sum + parsePrice(o.affiliate_amount || '0');
          }
          return sum;
        }, 0),
      };

      const refunds = {
        count: refundedOrders.length,
        total: refundedOrders.reduce((sum: number, o: any) => sum + parsePrice(o.total_price), 0),
        orders: refundedOrders.slice(0, limit),
      };

      const chargebacks = {
        count: chargebackOrders.length,
        total: chargebackOrders.reduce((sum: number, o: any) => sum + parsePrice(o.total_price), 0),
        orders: chargebackOrders.slice(0, limit),
      };

      // Paginate orders
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedOrders = affiliateOrders.slice(start, end);

      const analyticsResponse: AffiliateAnalyticsResponse = {
        affiliate: details,
        orders: paginatedOrders as any,
        summary,
        refunds,
        chargebacks,
        pagination: {
          total: affiliateOrders.length,
          page,
          limit,
          hasMore: end < affiliateOrders.length,
        },
        _meta: {
          cached: false,
          duration,
          timestamp: new Date().toISOString(),
        },
      };

      // Cache the response
      memoryCache.set(cacheKey, analyticsResponse);

      affiliateLogger.info(`Processed affiliate analytics in ${duration}ms`, { affiliateId });

      return NextResponse.json(analyticsResponse);
    }

    // Cache the response
    memoryCache.set(cacheKey, details);

    affiliateLogger.info(`Processed affiliate details in ${duration}ms`, { affiliateId });

    return NextResponse.json({
      ...details,
      _meta: {
        cached: false,
        duration,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    affiliateLogger.error('Error fetching affiliate details', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch affiliate details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Build monthly performance metrics for an affiliate
 */
function buildMonthlyPerformance(orders: CartPandaOrder[]): AffiliateMonthlyMetrics[] {
  const monthlyMap = new Map<
    string,
    {
      sales: number;
      revenue: number;
      commission: number;
      approved: number;
      refunded: number;
      total: number;
    }
  >();

  orders.forEach(order => {
    const date = new Date(order.created_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        sales: 0,
        revenue: 0,
        commission: 0,
        approved: 0,
        refunded: 0,
        total: 0,
      });
    }

    const metrics = monthlyMap.get(month)!;
    metrics.total += 1;

    if (isOrderPaid(order)) {
      metrics.sales += 1;
      metrics.revenue += parsePrice(order.total_price);
      metrics.commission += order.affiliate_amount
        ? parsePrice(order.affiliate_amount)
        : 0;
    }

    if (order.status === 'Paid' || order.status === 'Completed') {
      metrics.approved += 1;
    }

    if (order.status === 'Refunded') {
      metrics.refunded += 1;
    }
  });

  return Array.from(monthlyMap.entries())
    .map(([month, metrics]) => {
      const approvalRate =
        metrics.total > 0 ? (metrics.approved / metrics.total) * 100 : 0;

      // Simple quality score based on approval rate
      const qualityScore = Math.round(approvalRate);

      return {
        month,
        sales: metrics.sales,
        revenue: metrics.revenue,
        commission: metrics.commission,
        approvalRate,
        qualityScore,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

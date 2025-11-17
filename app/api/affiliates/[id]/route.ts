/**
 * GET /api/affiliates/[id]
 *
 * Returns detailed information for a specific affiliate
 */

import { NextRequest, NextResponse } from 'next/server';
import { cartPandaClient } from '@/lib/cartpanda/client';
import { memoryCache } from '@/lib/cache';
import {
  processAffiliateMetrics,
  buildAffiliateTimeline,
  buildProductBreakdown,
  buildActivityHeatmap,
} from '@/lib/affiliates/utils';
import { affiliateLogger, cacheLogger, logger } from '@/lib/logger';
import type { AffiliateDetails, AffiliateMonthlyMetrics } from '@/lib/affiliates/types';
import { parsePrice, isOrderPaid, extractLocalDate } from '@/lib/cartpanda/utils';
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

    // Create cache key
    const cacheKey = `affiliate:${affiliateId}:${startDate}:${endDate}`;

    // Check cache
    const cached = memoryCache.get<AffiliateDetails>(cacheKey);
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

    // Fetch orders from CartPanda
    const allOrders = await cartPandaClient.getAllOrders();

    // Filter orders for this affiliate (check all affiliate identifier fields)
    let affiliateOrders = allOrders.filter(
      order =>
        order.afid === affiliateId ||
        order.affiliate_slug === affiliateId ||
        order.affiliate_email === affiliateId ||
        order.affiliate_name === affiliateId
    );

    if (affiliateOrders.length === 0) {
      return NextResponse.json(
        {
          error: 'Affiliate not found',
          message: `No orders found for affiliate ${affiliateId}`,
        },
        { status: 404 }
      );
    }

    // Filter by date range if specified
    if (startDate && endDate) {
      affiliateOrders = affiliateOrders.filter(order => {
        const orderDate = extractLocalDate(order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });
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

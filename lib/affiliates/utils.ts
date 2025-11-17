/**
 * Utility functions for Affiliates Module
 *
 * Contains all calculation and processing logic for affiliate analytics
 */

import type { CartPandaOrder } from '@/lib/cartpanda/types';
import type {
  AffiliateMetrics,
  AffiliateKPIs,
  AffiliateDetails,
  AffiliateTimelineEntry,
  AffiliateProductMetrics,
  AffiliateActivityHeatmap,
  AffiliateMonthlyMetrics,
  AffiliateTrend,
  AffiliateStatus,
  QualityGrade,
} from './types';
import { parsePrice, extractLocalDate, isOrderPaid } from '@/lib/cartpanda/utils';
import { affiliateLogger } from '@/lib/logger';

/**
 * Calculate quality score based on approval, refund, and chargeback rates
 */
export function calculateQualityScore(metrics: {
  approvalRate: number;
  refundRate: number;
  chargebackRate: number;
}): number {
  const score =
    metrics.approvalRate * 0.4 +
    (100 - metrics.refundRate) * 0.3 +
    (100 - metrics.chargebackRate) * 0.3;

  return Math.round(score);
}

/**
 * Convert quality score to letter grade
 */
export function getQualityGrade(score: number): QualityGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Calculate trend based on growth percentage
 */
export function calculateTrend(growth: number): AffiliateTrend {
  if (growth > 5) return 'up';
  if (growth < -5) return 'down';
  return 'stable';
}

/**
 * Determine affiliate status based on activity
 */
export function getAffiliateStatus(
  lastSaleDate: string | null,
  totalSales: number
): AffiliateStatus {
  if (!lastSaleDate || totalSales === 0) return 'inactive';

  const daysSinceLastSale = Math.floor(
    (Date.now() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (totalSales < 5) return 'new';
  if (daysSinceLastSale > 30) return 'inactive';
  return 'active';
}

/**
 * Calculate product diversification score (0-100)
 * Higher score means more diverse product sales
 */
export function calculateDiversification(productSales: Map<string, number>): number {
  if (productSales.size === 0) return 0;
  if (productSales.size === 1) return 0;

  const total = Array.from(productSales.values()).reduce((sum, count) => sum + count, 0);
  const probabilities = Array.from(productSales.values()).map(count => count / total);

  // Calculate Shannon entropy
  const entropy = -probabilities.reduce((sum, p) => sum + p * Math.log2(p), 0);

  // Normalize to 0-100 scale (max entropy is log2(n))
  const maxEntropy = Math.log2(productSales.size);
  const score = (entropy / maxEntropy) * 100;

  return Math.round(score);
}

/**
 * Calculate average days between sales
 */
export function calculateAverageDaysBetweenSales(saleDates: string[]): number {
  if (saleDates.length <= 1) return 0;

  const sortedDates = saleDates
    .map(date => new Date(date).getTime())
    .sort((a, b) => a - b);

  const intervals: number[] = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const days = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    intervals.push(days);
  }

  const average = intervals.reduce((sum, days) => sum + days, 0) / intervals.length;
  return Math.round(average);
}

/**
 * Group orders by affiliate and calculate metrics
 */
export function processAffiliateMetrics(
  orders: CartPandaOrder[],
  dateRange: { startDate: string; endDate: string }
): Map<string, AffiliateMetrics> {
  const affiliateMap = new Map<string, AffiliateMetrics>();

  // Group orders by affiliate
  const affiliateOrders = new Map<string, CartPandaOrder[]>();

  orders.forEach(order => {
    // Check if order has affiliate data in any of the possible fields
    if (!order.afid && !order.affiliate_slug && !order.affiliate_name && !order.affiliate_email) {
      return;
    }

    // Use affiliate_email as primary key (unique per affiliate)
    // Fallback to affiliate_slug if email doesn't exist
    const affiliateId = order.affiliate_email || order.affiliate_slug || 'unknown';

    if (!affiliateOrders.has(affiliateId)) {
      affiliateOrders.set(affiliateId, []);
    }
    affiliateOrders.get(affiliateId)!.push(order);
  });

  // Calculate metrics for each affiliate
  affiliateOrders.forEach((orders, affiliateId) => {
    const firstOrder = orders[0];

    // Sales metrics
    const paidOrders = orders.filter(isOrderPaid);
    const totalSales = paidOrders.length;

    // Debug: Log order statuses for each affiliate (only in development)
    affiliateLogger.debug(
      `Processing affiliate ${affiliateId}: ${orders.length} total orders, ${paidOrders.length} paid`,
      { affiliateId, totalOrders: orders.length, paidOrders: paidOrders.length }
    );

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + parsePrice(order.total_price),
      0
    );
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Commission metrics
    const commissions = paidOrders.map(order =>
      order.affiliate_amount ? parsePrice(order.affiliate_amount) : 0
    );
    const totalCommission = commissions.reduce((sum, comm) => sum + comm, 0);
    const averageCommission = totalSales > 0 ? totalCommission / totalSales : 0;
    const commissionPercentage =
      totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    const highestCommission = commissions.length > 0 ? Math.max(...commissions) : 0;
    const lowestCommission = commissions.length > 0 ? Math.min(...commissions) : 0;

    // Quality metrics
    const approvedOrders = orders.filter(
      order => order.status === 'Paid' || order.status === 'Completed'
    ).length;
    const refundedOrders = orders.filter(order => order.status === 'Refunded').length;
    const chargebackOrders = orders.filter(order => order.status === 'Chargeback').length;

    const approvalRate = orders.length > 0 ? (approvedOrders / orders.length) * 100 : 0;
    const refundRate = orders.length > 0 ? (refundedOrders / orders.length) * 100 : 0;
    const chargebackRate = orders.length > 0 ? (chargebackOrders / orders.length) * 100 : 0;

    const qualityScore = calculateQualityScore({ approvalRate, refundRate, chargebackRate });
    const qualityGrade = getQualityGrade(qualityScore);

    // Product metrics
    const productSales = new Map<string, number>();
    const productRevenue = new Map<string, number>();

    orders.forEach(order => {
      const items = order.line_items || order.items || [];
      items.forEach(item => {
        const productId = String(item.product_id || 'unknown');
        productSales.set(productId, (productSales.get(productId) || 0) + 1);
        productRevenue.set(
          productId,
          (productRevenue.get(productId) || 0) + parsePrice(item.total_price || '0')
        );
      });
    });

    const topProductEntry = Array.from(productRevenue.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    const topProduct = topProductEntry
      ? {
          name: orders
            .flatMap(o => o.line_items || o.items || [])
            .find(item => String(item.product_id || 'unknown') === topProductEntry[0])?.name || 'Unknown',
          sales: productSales.get(topProductEntry[0]) || 0,
          revenue: topProductEntry[1],
        }
      : null;

    const diversification = calculateDiversification(productSales);

    // Temporal metrics
    const saleDates = paidOrders.map(order => order.created_at).sort();
    const firstSale = saleDates[0] || new Date().toISOString();
    const lastSale = saleDates[saleDates.length - 1] || new Date().toISOString();

    const daysActive = Math.floor(
      (new Date(lastSale).getTime() - new Date(firstSale).getTime()) / (1000 * 60 * 60 * 24)
    );

    const averageDaysBetweenSales = calculateAverageDaysBetweenSales(saleDates);

    // Activity metrics
    const dayCount = new Map<string, number>();
    const hourCount = new Map<number, number>();
    const activeDaysSet = new Set<string>();

    paidOrders.forEach(order => {
      const date = new Date(order.created_at);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hour = date.getHours();
      const dateStr = extractLocalDate(order.created_at);

      dayCount.set(dayName, (dayCount.get(dayName) || 0) + 1);
      hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
      activeDaysSet.add(dateStr);
    });

    const peakDay =
      Array.from(dayCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'monday';
    const peakHour =
      Array.from(hourCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
    const activeDays = activeDaysSet.size;

    // Status
    const status = getAffiliateStatus(lastSale, totalSales);

    affiliateMap.set(affiliateId, {
      id: affiliateId,
      name: firstOrder.affiliate_name || 'Unknown',
      email: firstOrder.affiliate_email || '',
      slug: firstOrder.affiliate_slug || '',
      status,
      sales: {
        total: totalSales,
        revenue: totalRevenue,
        averageTicket,
        growth: 0, // Will be calculated later with comparison period
        trend: 'stable',
      },
      commissions: {
        total: totalCommission,
        average: averageCommission,
        percentage: commissionPercentage,
        highest: highestCommission,
        lowest: lowestCommission,
      },
      quality: {
        approvalRate,
        refundRate,
        chargebackRate,
        score: qualityScore,
        grade: qualityGrade,
      },
      products: {
        total: productSales.size,
        diversification,
        topProduct,
      },
      temporal: {
        firstSale,
        lastSale,
        daysActive,
        averageDaysBetweenSales,
      },
      activity: {
        peakDay,
        peakHour,
        activeDays,
      },
      comparison: {
        rank: 0, // Will be set after sorting
        totalAffiliates: 0, // Will be set after processing all
        percentile: 0, // Will be calculated
        movement: 0, // Will be calculated with historical data
      },
    });
  });

  return affiliateMap;
}

/**
 * Calculate global KPIs for all affiliates
 */
export function calculateGlobalKPIs(affiliates: AffiliateMetrics[]): AffiliateKPIs {
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const newAffiliates = affiliates.filter(a => a.status === 'new').length;

  const totalRevenue = affiliates.reduce((sum, a) => sum + a.sales.revenue, 0);
  const totalCommissions = affiliates.reduce((sum, a) => sum + a.commissions.total, 0);
  const totalSales = affiliates.reduce((sum, a) => sum + a.sales.total, 0);

  const averageCommissionRate =
    affiliates.length > 0
      ? affiliates.reduce((sum, a) => sum + a.commissions.percentage, 0) / affiliates.length
      : 0;

  const averageQualityScore =
    affiliates.length > 0
      ? affiliates.reduce((sum, a) => sum + a.quality.score, 0) / affiliates.length
      : 0;

  const topPerformer = affiliates.sort((a, b) => b.sales.revenue - a.sales.revenue)[0] || null;

  return {
    totalAffiliates: affiliates.length,
    activeAffiliates,
    newAffiliates,
    totalRevenue,
    totalCommissions,
    averageCommissionRate,
    totalSales,
    averageQualityScore,
    topPerformer: topPerformer
      ? {
          id: topPerformer.id,
          name: topPerformer.name,
          revenue: topPerformer.sales.revenue,
        }
      : null,
  };
}

/**
 * Add ranking information to affiliates
 */
export function addRankingToAffiliates(
  affiliates: AffiliateMetrics[]
): AffiliateMetrics[] {
  const sorted = [...affiliates].sort((a, b) => b.sales.revenue - a.sales.revenue);

  return sorted.map((affiliate, index) => ({
    ...affiliate,
    comparison: {
      rank: index + 1,
      totalAffiliates: affiliates.length,
      percentile: Math.round(((affiliates.length - index) / affiliates.length) * 100),
      movement: 0, // TODO: Calculate with historical data
    },
  }));
}

/**
 * Build timeline for an affiliate
 */
export function buildAffiliateTimeline(orders: CartPandaOrder[]): AffiliateTimelineEntry[] {
  const timeline: AffiliateTimelineEntry[] = [];

  orders.forEach(order => {
    const amount = parsePrice(order.total_price);
    const items = order.line_items || order.items || [];
    const productName = items.length > 0 ? items[0].name : 'Unknown';

    if (order.status === 'Refunded') {
      timeline.push({
        date: order.created_at,
        type: 'refund',
        description: `Reembolso processado`,
        amount,
        orderId: String(order.id),
        productName,
      });
    } else if (order.status === 'Chargeback') {
      timeline.push({
        date: order.created_at,
        type: 'chargeback',
        description: `Chargeback registrado`,
        amount,
        orderId: String(order.id),
        productName,
      });
    } else if (isOrderPaid(order)) {
      timeline.push({
        date: order.created_at,
        type: 'sale',
        description: `Venda aprovada`,
        amount,
        orderId: String(order.id),
        productName,
      });
    }
  });

  return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Build product breakdown for an affiliate
 */
export function buildProductBreakdown(orders: CartPandaOrder[]): AffiliateProductMetrics[] {
  const productMap = new Map<string, AffiliateProductMetrics>();

  orders.forEach(order => {
    const items = order.line_items || order.items || [];
    items.forEach(item => {
      const productId = String(item.product_id || 'unknown');
      const productName = item.name || 'Unknown';
      const price = parsePrice(item.total_price || '0');
      const commission = order.affiliate_amount
        ? parsePrice(order.affiliate_amount)
        : 0;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          productId,
          productName,
          sales: 0,
          revenue: 0,
          commission: 0,
          percentage: 0,
          approvalRate: 0,
          refundRate: 0,
        });
      }

      const metrics = productMap.get(productId)!;
      if (isOrderPaid(order)) {
        metrics.sales += 1;
        metrics.revenue += price;
        metrics.commission += commission;
      }
    });
  });

  const totalRevenue = Array.from(productMap.values()).reduce(
    (sum, p) => sum + p.revenue,
    0
  );

  return Array.from(productMap.values())
    .map(product => ({
      ...product,
      percentage: totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/**
 * Build activity heatmap for an affiliate
 */
export function buildActivityHeatmap(orders: CartPandaOrder[]): AffiliateActivityHeatmap {
  const data: { day: string; hour: number; sales: number; revenue: number }[] = [];
  const heatmapMap = new Map<string, { sales: number; revenue: number }>();

  const paidOrders = orders.filter(isOrderPaid);

  paidOrders.forEach(order => {
    const date = new Date(order.created_at);
    const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hour = date.getHours();
    const key = `${day}-${hour}`;
    const revenue = parsePrice(order.total_price);

    if (!heatmapMap.has(key)) {
      heatmapMap.set(key, { sales: 0, revenue: 0 });
    }

    const cell = heatmapMap.get(key)!;
    cell.sales += 1;
    cell.revenue += revenue;
  });

  heatmapMap.forEach((value, key) => {
    const [day, hourStr] = key.split('-');
    data.push({
      day,
      hour: parseInt(hourStr),
      sales: value.sales,
      revenue: value.revenue,
    });
  });

  const peakActivity =
    data.sort((a, b) => b.sales - a.sales)[0] || { day: 'monday', hour: 0, sales: 0 };

  return { data, peakActivity };
}

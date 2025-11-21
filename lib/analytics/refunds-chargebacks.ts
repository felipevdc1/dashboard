/**
 * Analytics utilities for Refunds and Chargebacks
 *
 * This module provides comprehensive analysis of refunds and chargebacks including:
 * - Timeline analysis (by month)
 * - Cohort analysis (orders from month X that became rb/cb)
 * - Breakdown by affiliate
 * - Breakdown by product
 */

import { parsePrice, extractLocalDate } from '@/lib/shared/utils';

export interface TimelineDataPoint {
  month: string; // YYYY-MM
  refunds: {
    count: number;
    total: number;
  };
  chargebacks: {
    count: number;
    total: number;
  };
}

export interface CohortDataPoint {
  month: string; // YYYY-MM (order creation month)
  totalOrders: number;
  refunds: {
    count: number;
    percentage: number;
    total: number;
  };
  chargebacks: {
    count: number;
    percentage: number;
    total: number;
  };
  lossRate: number; // Combined percentage
}

export interface LossRateByEntity {
  id: string;
  name: string;
  sales: number;
  refunds: {
    count: number;
    percentage: number;
    total: number;
  };
  chargebacks: {
    count: number;
    percentage: number;
    total: number;
  };
  lossRate: number; // Combined percentage
}

/**
 * Calculate timeline of refunds/chargebacks by month (by EVENT date)
 */
export function calculateTimeline(orders: any[], months: number = 12): TimelineDataPoint[] {
  // Get last N months
  const monthsList: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // Initialize data for each month
  const timelineMap = new Map<string, TimelineDataPoint>();
  monthsList.forEach(month => {
    timelineMap.set(month, {
      month,
      refunds: { count: 0, total: 0 },
      chargebacks: { count: 0, total: 0 },
    });
  });

  // Process orders
  orders.forEach((order: any) => {
    // Process refunds (by processed_at)
    if (order.refunds && order.refunds.length > 0) {
      order.refunds.forEach((refund: any) => {
        const refundDate = new Date(refund.processed_at);
        const refundMonth = `${refundDate.getFullYear()}-${String(refundDate.getMonth() + 1).padStart(2, '0')}`;

        if (timelineMap.has(refundMonth)) {
          const data = timelineMap.get(refundMonth)!;
          data.refunds.count++;
          data.refunds.total += parseFloat(refund.total_amount || refund.sub_total || '0');
        }
      });
    }

    // Process chargebacks (by chargeback_at)
    if (order.chargeback_at) {
      const cbDate = new Date(order.chargeback_at);
      const cbMonth = `${cbDate.getFullYear()}-${String(cbDate.getMonth() + 1).padStart(2, '0')}`;

      if (timelineMap.has(cbMonth)) {
        const data = timelineMap.get(cbMonth)!;
        data.chargebacks.count++;
        data.chargebacks.total += parsePrice(order.total_price);
      }
    }
  });

  return Array.from(timelineMap.values());
}

/**
 * Calculate cohort analysis: orders from month X that became rb/cb
 * This shows "what happened to orders created in each month"
 */
export function calculateCohortAnalysis(orders: any[], months: number = 12): CohortDataPoint[] {
  // Get last N months
  const monthsList: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsList.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }

  // Group orders by creation month
  const cohortMap = new Map<string, CohortDataPoint>();
  monthsList.forEach(month => {
    cohortMap.set(month, {
      month,
      totalOrders: 0,
      refunds: { count: 0, percentage: 0, total: 0 },
      chargebacks: { count: 0, percentage: 0, total: 0 },
      lossRate: 0,
    });
  });

  // Process orders
  orders.forEach((order: any) => {
    const createdDate = new Date(order.created_at);
    const createdMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

    if (!cohortMap.has(createdMonth)) return;

    const data = cohortMap.get(createdMonth)!;
    data.totalOrders++;

    // Check if order has refunds
    if (order.refunds && order.refunds.length > 0) {
      data.refunds.count++;
      order.refunds.forEach((refund: any) => {
        data.refunds.total += parseFloat(refund.total_amount || refund.sub_total || '0');
      });
    }

    // Check if order has chargeback
    if (order.chargeback_at) {
      data.chargebacks.count++;
      data.chargebacks.total += parsePrice(order.total_price);
    }
  });

  // Calculate percentages
  cohortMap.forEach((data) => {
    if (data.totalOrders > 0) {
      data.refunds.percentage = (data.refunds.count / data.totalOrders) * 100;
      data.chargebacks.percentage = (data.chargebacks.count / data.totalOrders) * 100;
      data.lossRate = ((data.refunds.count + data.chargebacks.count) / data.totalOrders) * 100;
    }
  });

  return Array.from(cohortMap.values());
}

/**
 * Calculate loss rate breakdown by affiliate
 */
export function calculateByAffiliate(orders: any[]): LossRateByEntity[] {
  const affiliateMap = new Map<string, LossRateByEntity>();

  orders.forEach((order: any) => {
    const affiliateId = order.affiliate_slug || 'no-affiliate';
    const affiliateName = order.affiliate_name || 'Sem afiliado';

    if (!affiliateMap.has(affiliateId)) {
      affiliateMap.set(affiliateId, {
        id: affiliateId,
        name: affiliateName,
        sales: 0,
        refunds: { count: 0, percentage: 0, total: 0 },
        chargebacks: { count: 0, percentage: 0, total: 0 },
        lossRate: 0,
      });
    }

    const data = affiliateMap.get(affiliateId)!;
    data.sales++;

    // Check refunds
    if (order.refunds && order.refunds.length > 0) {
      data.refunds.count++;
      order.refunds.forEach((refund: any) => {
        data.refunds.total += parseFloat(refund.total_amount || refund.sub_total || '0');
      });
    }

    // Check chargebacks
    if (order.chargeback_at) {
      data.chargebacks.count++;
      data.chargebacks.total += parsePrice(order.total_price);
    }
  });

  // Calculate percentages
  const results = Array.from(affiliateMap.values());
  results.forEach((data) => {
    if (data.sales > 0) {
      data.refunds.percentage = (data.refunds.count / data.sales) * 100;
      data.chargebacks.percentage = (data.chargebacks.count / data.sales) * 100;
      data.lossRate = ((data.refunds.count + data.chargebacks.count) / data.sales) * 100;
    }
  });

  // Sort by loss rate (descending)
  return results.sort((a, b) => b.lossRate - a.lossRate);
}

/**
 * Calculate loss rate breakdown by product
 */
export function calculateByProduct(orders: any[]): LossRateByEntity[] {
  const productMap = new Map<string, LossRateByEntity>();

  orders.forEach((order: any) => {
    // Process each line item
    const items = order.line_items || order.items || [];
    items.forEach((item: any) => {
      const productId = String(item.product_id || item.id);
      const productName = item.name || item.title || 'Produto desconhecido';

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: productId,
          name: productName,
          sales: 0,
          refunds: { count: 0, percentage: 0, total: 0 },
          chargebacks: { count: 0, percentage: 0, total: 0 },
          lossRate: 0,
        });
      }

      const data = productMap.get(productId)!;
      data.sales++;

      // Check refunds (count full order as refund for this product)
      if (order.refunds && order.refunds.length > 0) {
        data.refunds.count++;
        // Approximate: divide refund amount by number of items
        const itemShare = 1 / items.length;
        order.refunds.forEach((refund: any) => {
          data.refunds.total += parseFloat(refund.total_amount || refund.sub_total || '0') * itemShare;
        });
      }

      // Check chargebacks
      if (order.chargeback_at) {
        data.chargebacks.count++;
        const itemShare = 1 / items.length;
        data.chargebacks.total += parsePrice(order.total_price) * itemShare;
      }
    });
  });

  // Calculate percentages
  const results = Array.from(productMap.values());
  results.forEach((data) => {
    if (data.sales > 0) {
      data.refunds.percentage = (data.refunds.count / data.sales) * 100;
      data.chargebacks.percentage = (data.chargebacks.count / data.sales) * 100;
      data.lossRate = ((data.refunds.count + data.chargebacks.count) / data.sales) * 100;
    }
  });

  // Sort by loss rate (descending)
  return results.sort((a, b) => b.lossRate - a.lossRate);
}

import type {
  CartPandaOrder,
  DashboardMetrics,
} from './types';
import { getCurrentAndPreviousMonthRanges } from '@/lib/dateUtils';
import {
  parsePrice,
  extractLocalDate,
  isOrderPaid,
  calculateRevenue,
  calculatePercentageChange,
  calculateDailyTrend,
  getTopProducts,
  getTopAffiliates,
  getRefundsAndChargebacks,
  calculateMonthlyComparison,
  getRecentActivities as getRecentActivitiesShared,
} from '@/lib/shared/utils';

// Re-export shared utilities for backward compatibility
export {
  parsePrice,
  extractLocalDate,
  isOrderPaid,
  formatCurrency,
  formatCurrencyBRL,
  formatNumber,
  getRelativeTime,
} from '@/lib/shared/utils';

/**
 * Calculate dashboard metrics from orders
 */
export function calculateMetrics(
  currentOrders: CartPandaOrder[],
  previousOrders: CartPandaOrder[],
  allOrders: CartPandaOrder[]
): DashboardMetrics {
  const currentRevenue = calculateRevenue(currentOrders);
  const previousRevenue = calculateRevenue(previousOrders);
  const revenueChange = calculatePercentageChange(previousRevenue, currentRevenue);

  const currentOrderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;
  const ordersChange = calculatePercentageChange(previousOrderCount, currentOrderCount);

  const currentAvgTicket = currentRevenue / (currentOrderCount || 1);
  const previousAvgTicket = previousRevenue / (previousOrderCount || 1);
  const avgTicketChange = calculatePercentageChange(previousAvgTicket, currentAvgTicket);

  // Calculate loss rate (refunds + chargebacks) / total orders
  const { refunds, chargebacks } = getRefundsAndChargebacks(currentOrders);

  const currentLossRate = currentOrderCount > 0
    ? ((refunds.count + chargebacks.count) / currentOrderCount) * 100
    : 0;

  // For now, no previous period comparison in this legacy file
  const lossRateChange = 0;
  const lossRateTrend = [0, 0, 0, 0, 0, 0, 0];

  const topProducts = getTopProducts(currentOrders);
  const topAffiliates = getTopAffiliates(currentOrders);

  const revenueTrend = calculateDailyTrend(currentOrders, 'revenue');
  const ordersTrend = calculateDailyTrend(currentOrders, 'count');
  const ticketTrend = calculateDailyTrend(currentOrders, 'average');

  // Calculate monthly comparison ALWAYS with current and previous month
  // This ensures the chart always shows month-over-month comparison
  const monthRanges = getCurrentAndPreviousMonthRanges();
  const monthlyComparison = calculateMonthlyComparison(
    allOrders,
    monthRanges.currentMonth,
    monthRanges.previousMonth
  );

  return {
    revenue: {
      total: currentRevenue,
      change: revenueChange,
      trend: revenueTrend,
    },
    orders: {
      total: currentOrderCount,
      change: ordersChange,
      trend: ordersTrend,
    },
    averageTicket: {
      value: currentAvgTicket,
      change: avgTicketChange,
      trend: ticketTrend,
    },
    lossRate: {
      value: currentLossRate,
      change: lossRateChange,
      trend: lossRateTrend,
    },
    topProducts,
    topAffiliates,
    refunds,
    chargebacks,
    monthlyComparison,
  };
}

/**
 * Get recent activities for activity feed
 * Wrapper for shared implementation with CartPandaOrder type
 */
export function getRecentActivities(orders: CartPandaOrder[]) {
  return getRecentActivitiesShared(orders);
}

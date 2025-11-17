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

  // Mock conversion rate for now (requires additional data like visits)
  const conversionRate = 3.8;
  const conversionChange = -1.2;

  const topProducts = getTopProducts(currentOrders);
  const topAffiliates = getTopAffiliates(currentOrders);

  const { refunds, chargebacks } = getRefundsAndChargebacks(currentOrders);

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
    conversionRate: {
      value: conversionRate,
      change: conversionChange,
      trend: [4.2, 4.0, 3.9, 4.1, 3.8, 3.7, 3.8],
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

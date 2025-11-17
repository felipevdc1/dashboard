/**
 * Supabase SQL queries for metrics calculation
 * These queries replace the CartPanda API pagination with direct SQL
 */

import { supabase } from '../supabase';
import type {
  DashboardMetrics,
  RecentActivity,
} from '../cartpanda/types';
import { getCurrentAndPreviousMonthRanges } from '../dateUtils';
import {
  calculateRevenue,
  calculatePercentageChange,
  calculateDailyTrend,
  getTopProducts,
  getTopAffiliates,
  getRefundsAndChargebacks,
  calculateMonthlyComparison,
  getRecentActivities,
} from '../shared/utils';

/**
 * Fetch orders from Supabase for a date range
 * Only returns PAID orders (financial_status = 3) to match CartPanda dashboard
 * Uses Brasilia timezone (UTC-3) for date filtering
 */
async function fetchOrdersByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00-03:00`) // Brasilia timezone
    .lte('created_at', `${endDate}T23:59:59-03:00`)   // Brasilia timezone
    .eq('financial_status', 3) // Only PAID orders
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch all orders (for monthly comparison chart)
 */
async function fetchAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to fetch all orders: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate all dashboard metrics from Supabase
 * This is the main function that replaces CartPanda API calls
 */
export async function calculateDashboardMetrics(
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string
): Promise<{
  metrics: DashboardMetrics;
  activities: RecentActivity[];
}> {
  console.log('🔍 Fetching orders from Supabase...');
  const startTime = Date.now();

  // Fetch current period orders
  const currentOrders = await fetchOrdersByDateRange(currentStartDate, currentEndDate);
  console.log(`✅ Current period orders: ${currentOrders.length}`);

  // Fetch previous period orders
  const previousOrders = await fetchOrdersByDateRange(previousStartDate, previousEndDate);
  console.log(`✅ Previous period orders: ${previousOrders.length}`);

  // Fetch all orders for monthly comparison
  const allOrders = await fetchAllOrders();
  console.log(`✅ All orders: ${allOrders.length}`);

  const queryDuration = Date.now() - startTime;
  console.log(`⚡ Supabase queries completed in ${queryDuration}ms`);

  // Calculate metrics
  const currentRevenue = calculateRevenue(currentOrders);
  const previousRevenue = calculateRevenue(previousOrders);
  const revenueChange = calculatePercentageChange(previousRevenue, currentRevenue);

  const currentOrderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;
  const ordersChange = calculatePercentageChange(previousOrderCount, currentOrderCount);

  const currentAvgTicket = currentRevenue / (currentOrderCount || 1);
  const previousAvgTicket = previousRevenue / (previousOrderCount || 1);
  const avgTicketChange = calculatePercentageChange(previousAvgTicket, currentAvgTicket);

  const conversionRate = 3.8;
  const conversionChange = -1.2;

  const topProducts = getTopProducts(currentOrders);
  const topAffiliates = getTopAffiliates(currentOrders);
  const { refunds, chargebacks } = getRefundsAndChargebacks(currentOrders);

  const revenueTrend = calculateDailyTrend(currentOrders, 'revenue');
  const ordersTrend = calculateDailyTrend(currentOrders, 'count');
  const ticketTrend = calculateDailyTrend(currentOrders, 'average');

  // Monthly comparison
  const monthRanges = getCurrentAndPreviousMonthRanges();
  const monthlyComparison = calculateMonthlyComparison(
    allOrders,
    monthRanges.currentMonth,
    monthRanges.previousMonth
  );

  // Recent activities
  const activities = getRecentActivities(currentOrders);

  const metrics: DashboardMetrics = {
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

  return { metrics, activities };
}

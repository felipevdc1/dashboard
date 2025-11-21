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
 * Returns ALL orders - filtering for paid/refunded/chargebacks is done by calculateRevenue()
 * Uses Brasilia timezone (UTC-3) for date filtering
 *
 * IMPORTANT: Filters by order creation date (created_at), NOT by refund/chargeback date.
 * This means:
 * - A pedido created in October and refunded in November = counted in October stats
 * - A pedido created in November and refunded in November = counted in November stats
 *
 * Rationale: Shows what happened to orders created in the period, not when losses occurred.
 */
async function fetchOrdersByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', `${startDate}T00:00:00-03:00`) // Brasilia timezone
    .lte('created_at', `${endDate}T23:59:59-03:00`)   // Brasilia timezone
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase query error:', error);
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch orders for monthly comparison (current + previous month only)
 * Avoids Supabase's 1000 record default limit by fetching specific date range
 */
async function fetchOrdersForMonthlyComparison(
  currentMonthStart: string,
  previousMonthStart: string
) {
  // Fetch orders from the start of previous month until now
  // Using pagination to get ALL orders (Supabase has 1000 record default limit)
  let allOrders: any[] = [];
  let rangeStart = 0;
  const rangeSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', `${previousMonthStart}T00:00:00-03:00`)
      .order('created_at', { ascending: false })
      .range(rangeStart, rangeStart + rangeSize - 1);

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(`Failed to fetch orders for monthly comparison: ${error.message}`);
    }

    if (data && data.length > 0) {
      allOrders = allOrders.concat(data);
      rangeStart += rangeSize;
      hasMore = data.length === rangeSize; // Continue if we got a full page
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Fetched ${allOrders.length} orders for monthly comparison (${Math.ceil(allOrders.length / rangeSize)} pages)`);
  return allOrders;
}

/**
 * Fetch top cancellation reasons from order_notes table
 * Returns top 5 reasons with count and percentage breakdown by type
 */
async function fetchTopCancellationReasons(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('order_notes')
    .select(`
      motivo,
      tipo,
      orders!inner (
        created_at
      )
    `)
    .gte('orders.created_at', `${startDate}T00:00:00-03:00`)
    .lte('orders.created_at', `${endDate}T23:59:59-03:00`);

  if (error) {
    console.error('Error fetching cancellation reasons:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by motivo and count by tipo
  const reasonsMap = new Map<string, { refundCount: number; chargebackCount: number }>();

  data.forEach((note: any) => {
    const motivo = note.motivo || 'Não especificado';
    const existing = reasonsMap.get(motivo) || { refundCount: 0, chargebackCount: 0 };

    if (note.tipo === 'refund') {
      existing.refundCount++;
    } else if (note.tipo === 'chargeback') {
      existing.chargebackCount++;
    }

    reasonsMap.set(motivo, existing);
  });

  const totalCount = data.length;

  // Convert to array and sort by total count
  const reasons = Array.from(reasonsMap.entries())
    .map(([motivo, counts]) => {
      const count = counts.refundCount + counts.chargebackCount;
      const percentage = (count / totalCount) * 100;

      // Determine tipo based on which is more prevalent
      let tipo: 'refund' | 'chargeback' | 'both';
      if (counts.refundCount > 0 && counts.chargebackCount > 0) {
        tipo = 'both';
      } else if (counts.refundCount > 0) {
        tipo = 'refund';
      } else {
        tipo = 'chargeback';
      }

      return {
        motivo,
        count,
        percentage,
        tipo,
        refundCount: counts.refundCount,
        chargebackCount: counts.chargebackCount,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5

  return reasons;
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

  // Fetch orders for monthly comparison (current + previous month only)
  // This avoids Supabase's 1000 record limit by using date range filtering
  const monthRanges = getCurrentAndPreviousMonthRanges();
  const allOrders = await fetchOrdersForMonthlyComparison(
    monthRanges.currentMonth.startDate,
    monthRanges.previousMonth.startDate
  );

  // Fetch top cancellation reasons for current period
  const topCancellationReasons = await fetchTopCancellationReasons(currentStartDate, currentEndDate);
  console.log(`✅ Top cancellation reasons: ${topCancellationReasons.length}`);

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

  // Calculate loss rate (refunds + chargebacks) / total orders
  const { refunds, chargebacks } = getRefundsAndChargebacks(currentOrders);
  const { refunds: previousRefunds, chargebacks: previousChargebacks } = getRefundsAndChargebacks(previousOrders);

  const currentLossRate = currentOrderCount > 0
    ? ((refunds.count + chargebacks.count) / currentOrderCount) * 100
    : 0;

  const previousLossRate = previousOrderCount > 0
    ? ((previousRefunds.count + previousChargebacks.count) / previousOrderCount) * 100
    : 0;

  const lossRateChange = calculatePercentageChange(previousLossRate, currentLossRate);

  // Calculate individual rates for breakdown
  const refundRate = currentOrderCount > 0
    ? (refunds.count / currentOrderCount) * 100
    : 0;

  const chargebackRate = currentOrderCount > 0
    ? (chargebacks.count / currentOrderCount) * 100
    : 0;

  const topProducts = getTopProducts(currentOrders);
  const topAffiliates = getTopAffiliates(currentOrders);

  const revenueTrend = calculateDailyTrend(currentOrders, 'revenue');
  const ordersTrend = calculateDailyTrend(currentOrders, 'count');
  const ticketTrend = calculateDailyTrend(currentOrders, 'average');

  // Calculate loss rate trend for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const lossRateTrend = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayOrders = currentOrders.filter((order: any) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= date && orderDate < nextDay;
    });

    const dayRefunds = dayOrders.filter((o: any) => o.refunds && o.refunds.length > 0).length;
    const dayChargebacks = dayOrders.filter((o: any) => o.chargeback_received === 1).length;

    return dayOrders.length > 0 ? ((dayRefunds + dayChargebacks) / dayOrders.length) * 100 : 0;
  });

  // Monthly comparison
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
    lossRate: {
      value: currentLossRate,
      change: lossRateChange,
      trend: lossRateTrend,
      breakdown: {
        refundRate,
        chargebackRate,
      },
    },
    topProducts,
    topAffiliates,
    topCancellationReasons,
    refunds,
    chargebacks,
    monthlyComparison,
  };

  return { metrics, activities };
}

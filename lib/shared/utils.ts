/**
 * Shared utility functions used across CartPanda and Supabase modules
 * Extracted to eliminate code duplication
 */

import type {
  ProductPerformance,
  AffiliatePerformance,
  RecentActivity,
  MonthlyComparisonData,
} from '../cartpanda/types';

/**
 * Parse CartPanda price string to number
 * Converts "1,707.31" to 1707.31
 */
export function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  return parseFloat(price.replace(/,/g, ''));
}

/**
 * Extract local date from ISO datetime string with timezone
 * Extracts "2025-11-09" from "2025-11-09T23:28:16-03:00"
 * This preserves the local date without converting to UTC
 */
export function extractLocalDate(dateString: string): string {
  return dateString.split('T')[0];
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Check if order is paid
 * Accepts either an order object or individual status parameters
 */
export function isOrderPaid(
  orderOrFinancialStatus: any | number,
  payment_status?: number
): boolean {
  // If called with two parameters (financial_status, payment_status)
  if (typeof orderOrFinancialStatus === 'number' && payment_status !== undefined) {
    return orderOrFinancialStatus === 3 || payment_status === 3;
  }
  // If called with order object
  const order = orderOrFinancialStatus;
  return order.financial_status === 3 || order.payment_status === 3;
}

/**
 * Calculate net revenue from orders in BRL (after refunds and chargebacks)
 * Accepts either CartPandaOrder[] or any[] for flexibility
 */
export function calculateRevenue(orders: any[]): number {
  return orders.reduce((sum, order) => {
    // Skip refunded orders (check refunds array)
    if (order.refunds && order.refunds.length > 0) {
      return sum;
    }

    // Skip chargeback orders (check chargeback_received flag)
    if (order.chargeback_received === 1) {
      return sum;
    }

    // Only count paid orders - handle both calling patterns
    const isPaid = order.financial_status !== undefined
      ? isOrderPaid(order)
      : isOrderPaid(order.financial_status, order.payment_status);

    if (isPaid) {
      return sum + parsePrice(order.total_price);
    }

    return sum;
  }, 0);
}

/**
 * Calculate daily trend for sparklines
 */
export function calculateDailyTrend(
  orders: any[],
  type: 'revenue' | 'count' | 'average'
): number[] {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const dailyData = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayOrders = orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= date && orderDate < nextDay;
    });

    if (type === 'revenue') {
      return calculateRevenue(dayOrders);
    } else if (type === 'count') {
      return dayOrders.length;
    } else {
      // average
      const revenue = calculateRevenue(dayOrders);
      return revenue / (dayOrders.length || 1);
    }
  });

  return dailyData;
}

/**
 * Get top performing products
 */
export function getTopProducts(orders: any[]): ProductPerformance[] {
  const productMap = new Map<string, { name: string; sales: number; revenue: number }>();

  orders.forEach((order) => {
    if (isOrderPaid(order)) {
      order.line_items?.forEach((item: any) => {
        const productId = item.product_id.toString();
        const existing = productMap.get(productId) || {
          name: item.title || item.name,
          sales: 0,
          revenue: 0,
        };

        productMap.set(productId, {
          name: item.title || item.name,
          sales: existing.sales + item.quantity,
          revenue: existing.revenue + parsePrice(item.total_price),
        });
      });
    }
  });

  return Array.from(productMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      sales: data.sales,
      revenue: data.revenue,
      change: 0, // Would need historical data
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

/**
 * Get top performing affiliates
 */
export function getTopAffiliates(orders: any[]): AffiliatePerformance[] {
  const affiliateMap = new Map<
    string,
    { name: string; email: string; sales: number; revenue: number; commission: number }
  >();

  orders.forEach((order) => {
    if (isOrderPaid(order) && order.affiliate_name && order.affiliate_email) {
      const affiliateId = order.affiliate_slug || order.affiliate_email;
      const existing = affiliateMap.get(affiliateId) || {
        name: order.affiliate_name,
        email: order.affiliate_email,
        sales: 0,
        revenue: 0,
        commission: 0,
      };

      const orderRevenue = parsePrice(order.total_price);
      const orderCommission = parsePrice(order.affiliate_amount || '0');

      affiliateMap.set(affiliateId, {
        ...existing,
        sales: existing.sales + 1,
        revenue: existing.revenue + orderRevenue,
        commission: existing.commission + orderCommission,
      });
    }
  });

  return Array.from(affiliateMap.entries())
    .map(([id, data]) => ({
      id,
      name: data.name,
      email: data.email,
      sales: data.sales,
      revenue: data.revenue,
      commission: data.commission,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

/**
 * Get refunds and chargebacks statistics
 */
export function getRefundsAndChargebacks(orders: any[]) {
  const totalRevenue = calculateRevenue(orders);

  const refunds = orders.reduce(
    (acc, order) => {
      // Check if order has refunds array with items
      if (order.refunds && order.refunds.length > 0) {
        const refundAmount = parsePrice(order.total_price);
        return {
          count: acc.count + 1,
          total: acc.total + refundAmount,
        };
      }
      return acc;
    },
    { count: 0, total: 0 }
  );

  const chargebacks = orders.reduce(
    (acc, order) => {
      // Check if order has chargeback (chargeback_at is set)
      // NOTE: chargeback_received field is always 0, use chargeback_at instead
      if (order.chargeback_at !== null && order.chargeback_at !== '') {
        const chargebackAmount = parsePrice(order.total_price);
        return {
          count: acc.count + 1,
          total: acc.total + chargebackAmount,
        };
      }
      return acc;
    },
    { count: 0, total: 0 }
  );

  return {
    refunds: {
      ...refunds,
      percentage: totalRevenue > 0 ? (refunds.total / totalRevenue) * 100 : 0,
    },
    chargebacks: {
      ...chargebacks,
      percentage: totalRevenue > 0 ? (chargebacks.total / totalRevenue) * 100 : 0,
    },
  };
}

/**
 * Calculate monthly comparison data for chart
 * Returns day-by-day comparison between current and previous month
 */
export function calculateMonthlyComparison(
  allOrders: any[],
  currentMonthRange: { startDate: string; endDate: string },
  previousMonthRange: { startDate: string; endDate: string }
): MonthlyComparisonData {
  // Filter orders for current month
  const currentMonthOrders = allOrders.filter(order => {
    const orderDate = extractLocalDate(order.created_at);
    return orderDate >= currentMonthRange.startDate && orderDate <= currentMonthRange.endDate;
  });

  // Filter orders for previous month
  const previousMonthOrders = allOrders.filter(order => {
    const orderDate = extractLocalDate(order.created_at);
    return orderDate >= previousMonthRange.startDate && orderDate <= previousMonthRange.endDate;
  });

  // Calculate days in current month (e.g., November = 30 days)
  // Always show full month (1-30 or 1-31) regardless of current day
  const currentMonthDate = new Date(currentMonthRange.startDate);
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate labels for all days in the month
  const labels: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(day.toString());
  }

  // Initialize data arrays
  const currentMonthRevenue: number[] = [];
  const currentMonthOrdersCount: number[] = [];
  const previousMonthRevenue: number[] = [];
  const previousMonthOrdersCount: number[] = [];

  // Calculate data for each day of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Filter current month orders for this day
    const currentDayOrders = currentMonthOrders.filter(order => {
      const orderDate = new Date(extractLocalDate(order.created_at));
      return orderDate.getDate() === day;
    });

    // Filter previous month orders for this day
    const previousDayOrders = previousMonthOrders.filter(order => {
      const orderDate = new Date(extractLocalDate(order.created_at));
      return orderDate.getDate() === day;
    });

    // Calculate metrics for current month
    const currentRevenue = calculateRevenue(currentDayOrders);
    const currentCount = currentDayOrders.filter(isOrderPaid).length;

    // Calculate metrics for previous month
    const previousRevenue = calculateRevenue(previousDayOrders);
    const previousCount = previousDayOrders.filter(isOrderPaid).length;

    // Add to arrays
    currentMonthRevenue.push(currentRevenue);
    currentMonthOrdersCount.push(currentCount);
    previousMonthRevenue.push(previousRevenue);
    previousMonthOrdersCount.push(previousCount);
  }

  return {
    labels,
    currentMonth: {
      revenue: currentMonthRevenue,
      orders: currentMonthOrdersCount,
    },
    previousMonth: {
      revenue: previousMonthRevenue,
      orders: previousMonthOrdersCount,
    },
  };
}

/**
 * Get recent activities for activity feed
 */
export function getRecentActivities(orders: any[]): RecentActivity[] {
  const activities: RecentActivity[] = [];

  // Sort orders by most recent
  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  sortedOrders.slice(0, 10).forEach((order) => {
    const orderAmount = parsePrice(order.total_price);
    const customerName = `${order.customer.first_name} ${order.customer.last_name}`;

    // New order
    if (isOrderPaid(order)) {
      // Build description with customer name and optional affiliate indicator
      const hasAffiliate = order.affiliate_name || order.affiliate_slug || order.afid;
      const description = hasAffiliate
        ? `${customerName} • via ${order.affiliate_name || order.affiliate_slug || order.afid} (afiliado)`
        : `${customerName}`;

      activities.push({
        id: `order-${order.id}`,
        type: 'order',
        title: `Novo pedido #${order.order_number} aprovado`,
        description,
        amount: orderAmount,
        timestamp: order.created_at,
      });
    }

    // Refund
    if (order.refunds && order.refunds.length > 0) {
      activities.push({
        id: `refund-${order.id}`,
        type: 'refund',
        title: `Reembolso solicitado #${order.order_number}`,
        description: `Cliente: ${customerName} - ${formatCurrency(orderAmount)}`,
        amount: orderAmount,
        timestamp: order.updated_at,
      });
    }

    // Chargeback
    if (order.chargeback_received === 1) {
      activities.push({
        id: `chargeback-${order.id}`,
        type: 'chargeback',
        title: `Chargeback recebido #${order.order_number}`,
        description: `Valor: ${formatCurrency(orderAmount)} - em análise`,
        amount: orderAmount,
        timestamp: order.chargeback_at || order.updated_at,
      });
    }
  });

  return activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 4);
}

/**
 * Format currency to BRL
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * @deprecated Use formatCurrency instead (now formats as BRL)
 * Format currency to BRL
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Format number with K/M suffix
 */
export function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toFixed(0);
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'agora mesmo';
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hora${diffInHours > 1 ? 's' : ''} atrás`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`;
}

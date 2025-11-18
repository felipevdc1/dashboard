/**
 * Types for Affiliates Module
 *
 * Defines all TypeScript interfaces and types for affiliate analytics
 */

export type AffiliateTrend = 'up' | 'down' | 'stable';
export type AffiliateStatus = 'active' | 'inactive' | 'new';
export type QualityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Main interface for affiliate metrics
 */
export interface AffiliateMetrics {
  id: string;
  name: string;
  email: string;
  slug: string;
  status: AffiliateStatus;

  sales: {
    total: number;
    revenue: number;
    averageTicket: number;
    growth: number;
    trend: AffiliateTrend;
  };

  commissions: {
    total: number;
    average: number;
    percentage: number;
    highest: number;
    lowest: number;
  };

  quality: {
    approvalRate: number;
    refundRate: number;
    chargebackRate: number;
    score: number;
    grade: QualityGrade;
  };

  products: {
    total: number;
    diversification: number; // 0-100 score
    topProduct: {
      name: string;
      sales: number;
      revenue: number;
    } | null;
  };

  temporal: {
    firstSale: string; // ISO date
    lastSale: string; // ISO date
    daysActive: number;
    averageDaysBetweenSales: number;
  };

  activity: {
    peakDay: string; // 'monday', 'tuesday', etc
    peakHour: number; // 0-23
    activeDays: number; // days with at least 1 sale
  };

  comparison: {
    rank: number;
    totalAffiliates: number;
    percentile: number; // 0-100
    movement: number; // +/- position change
  };
}

/**
 * Filters for affiliate list
 */
export interface AffiliateFilters {
  status?: AffiliateStatus[];
  qualityGrade?: QualityGrade[];
  minSales?: number;
  maxSales?: number;
  minRevenue?: number;
  maxRevenue?: number;
  minQualityScore?: number;
  maxQualityScore?: number;
  search?: string; // name, email, slug
  sortBy?: 'revenue' | 'sales' | 'quality' | 'commission' | 'growth' | 'avgTicket';
  sortOrder?: 'asc' | 'desc';
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Response from /api/affiliates endpoint
 */
export interface AffiliatesResponse {
  affiliates: AffiliateMetrics[];
  kpis: AffiliateKPIs;
  filters: AffiliateFilters;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  _meta: {
    cached: boolean;
    duration: number;
    timestamp: string;
  };
}

/**
 * Global KPIs for affiliates module
 */
export interface AffiliateKPIs {
  totalAffiliates: number;
  activeAffiliates: number;
  newAffiliates: number;
  totalRevenue: number;
  totalCommissions: number;
  averageCommissionRate: number;
  totalSales: number;
  averageQualityScore: number;
  topPerformer: {
    id: string;
    name: string;
    revenue: number;
  } | null;
}

/**
 * Extended details for individual affiliate (used in modal)
 */
export interface AffiliateDetails extends AffiliateMetrics {
  timeline: AffiliateTimelineEntry[];
  productBreakdown: AffiliateProductMetrics[];
  activityHeatmap: AffiliateActivityHeatmap;
  monthlyPerformance: AffiliateMonthlyMetrics[];
}

/**
 * Timeline entry for affiliate activity
 */
export interface AffiliateTimelineEntry {
  date: string; // ISO date
  type: 'sale' | 'refund' | 'chargeback' | 'milestone';
  description: string;
  amount?: number;
  orderId?: string;
  productName?: string;
}

/**
 * Product-level metrics for an affiliate
 */
export interface AffiliateProductMetrics {
  productId: string;
  productName: string;
  sales: number;
  revenue: number;
  commission: number;
  percentage: number; // % of affiliate's total revenue
  approvalRate: number;
  refundRate: number;
}

/**
 * Heatmap data for affiliate activity patterns
 */
export interface AffiliateActivityHeatmap {
  data: {
    day: string; // 'monday', 'tuesday', etc
    hour: number; // 0-23
    sales: number;
    revenue: number;
  }[];
  peakActivity: {
    day: string;
    hour: number;
    sales: number;
  };
}

/**
 * Monthly performance metrics for an affiliate
 */
export interface AffiliateMonthlyMetrics {
  month: string; // 'YYYY-MM'
  sales: number;
  revenue: number;
  commission: number;
  approvalRate: number;
  qualityScore: number;
}

/**
 * Export configuration
 */
export interface AffiliateExportConfig {
  format: 'csv' | 'xlsx' | 'json';
  fields: string[];
  filters: AffiliateFilters;
  includeDetails?: boolean;
}

/**
 * Response from /api/affiliates/[id] with orders list
 * Used for detailed analytics page
 */
export interface AffiliateAnalyticsResponse {
  affiliate: AffiliateDetails;
  orders: AffiliateOrderItem[];
  summary: {
    total: number;
    paid: number;
    refunded: number;
    chargebacks: number;
    pending: number;
    revenue: number;
    commission: number;
  };
  refunds: {
    count: number;
    total: number;
    orders: AffiliateOrderItem[];
  };
  chargebacks: {
    count: number;
    total: number;
    orders: AffiliateOrderItem[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
  _meta: {
    cached: boolean;
    duration: number;
    timestamp: string;
  };
}

/**
 * Simplified order item for affiliate analytics
 */
export interface AffiliateOrderItem {
  id: number;
  order_number: string;
  created_at: string;
  status: string; // "Paid", "Refunded", "Chargeback", etc
  financial_status: number;
  total_price: string;
  affiliate_amount: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: {
    id: number;
    title: string;
    quantity: number;
    price: string;
  }[];
  refunds?: any[];
  chargeback_received?: number;
}

/**
 * Filters for order list in analytics page
 */
export interface OrderStatusFilter {
  paid?: boolean;
  refunded?: boolean;
  chargebacks?: boolean;
  pending?: boolean;
}

// CartPanda API Types

export interface CartPandaOrder {
  id: number;
  order_number: string;
  status_id: string;
  status?: string; // "Paid", "Completed", "Refunded", "Chargeback", etc.
  financial_status: number; // 3 = paid
  payment_status: number; // 3 = paid
  currency: string; // "USD"
  total_price: string; // "1,707.31" (BRL)
  subtotal_price: string;
  current_total_discounts: string;
  local_currency_amount: string; // "322.67" (USD)
  exchange_rate_USD: string; // "0.18899300"
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  line_items: OrderItem[];
  items?: OrderItem[]; // Alias for line_items (for compatibility)
  payment: {
    id: number;
    gateway: string;
    type: string;
    payment_type: string;
    status_id: number;
    amount: number;
  };
  // Affiliate fields (flat on order object)
  afid?: string | number; // Affiliate ID from body/query params
  affiliate_name: string | null;
  affiliate_email: string | null;
  affiliate_slug: string;
  affiliate_amount: string;
  // Refund tracking
  refunds?: CartPandaRefund[]; // Array of refund objects
  // Chargeback tracking
  chargeback_received: number; // 0 or 1
  chargeback_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * CartPanda Refund Structure
 *
 * IMPORTANT: Este é o formato retornado pela API CartPanda.
 * O campo 'note' contém notas do AGENTE de suporte, NÃO as notas internas do CSV.
 */
export interface CartPandaRefund {
  id: number;
  order_id: number;
  status_id: number; // 3 = processed
  sub_total: string; // Valor com vírgula (ex: "955.74")
  total_amount: string; // Valor total reembolsado
  note: string; // Formato: "Agent: ...\nReason for Contact: ...\nThreat/Request: ...\nResolution: ...\nOffer: ..."
  created_at: string; // ISO 8601 timestamp
  updated_at: string;
  processed_at: string; // Data de processamento do refund
}

export interface OrderItem {
  id: number;
  product_id: number;
  name: string;
  title: string;
  quantity: number;
  price: number;
  total_price: string; // "1,555.61" (BRL)
  local_currency_item_price: string; // USD unit price
  local_currency_item_total_price: string; // USD total price
}

export interface CartPandaProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
  stock?: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface OrdersListResponse {
  orders: CartPandaOrder[];
  meta?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

export interface ProductsListResponse {
  data: CartPandaProduct[];
  meta?: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
}

// Dashboard Metrics Types
export interface MonthlyComparisonData {
  labels: string[]; // Days of month: ['1', '2', '3', ... '30']
  currentMonth: {
    revenue: number[];
    orders: number[];
  };
  previousMonth: {
    revenue: number[];
    orders: number[];
  };
}

export interface DashboardMetrics {
  revenue: {
    total: number;
    change: number;
    trend: number[];
  };
  orders: {
    total: number;
    change: number;
    trend: number[];
  };
  averageTicket: {
    value: number;
    change: number;
    trend: number[];
  };
  conversionRate: {
    value: number;
    change: number;
    trend: number[];
  };
  topProducts: ProductPerformance[];
  topAffiliates: AffiliatePerformance[];
  refunds: {
    count: number;
    total: number;
    percentage: number;
  };
  chargebacks: {
    count: number;
    total: number;
    percentage: number;
  };
  monthlyComparison?: MonthlyComparisonData;
}

export interface ProductPerformance {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  change: number;
}

export interface AffiliatePerformance {
  id: string;
  name: string;
  email: string;
  sales: number;
  revenue: number;
  commission: number;
}

export interface RecentActivity {
  id: string;
  type: 'order' | 'affiliate' | 'refund' | 'chargeback';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
}

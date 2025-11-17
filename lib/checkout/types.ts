/**
 * Multi-Checkout Adapter Pattern
 *
 * Unified interface for different checkout platforms (CartPanda, Digistore24, etc.)
 */

export type CheckoutSource = 'cartpanda' | 'digistore24';

/**
 * Unified order structure for database storage
 * Maps to public.orders table
 */
export interface UnifiedOrder {
  // Multi-checkout fields
  source: CheckoutSource;
  source_order_id: string;
  raw_payload?: any; // Original API response

  // Common order fields
  id: number;
  order_number: string;
  status_id: string;
  financial_status: number;
  payment_status: number;

  // Pricing
  currency: string;
  total_price: string;
  subtotal_price: string;
  current_total_discounts: string;
  local_currency_amount: string;
  exchange_rate_usd: string | null;

  // Customer data
  customer: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };

  // Line items
  line_items: Array<{
    id: number;
    product_id: number;
    name: string;
    title: string;
    quantity: number;
    price: number;
    total_price: string;
  }>;

  // Payment info
  payment: {
    id: number;
    gateway: string;
    type: string;
    payment_type: string;
    status_id: number;
    amount: number;
  };

  // Affiliate info
  afid?: string | number;
  affiliate_name: string | null;
  affiliate_email: string | null;
  affiliate_slug: string;
  affiliate_amount: string;

  // Refunds & chargebacks
  refunds?: any;
  chargeback_received: number;
  chargeback_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  synced_at: string;
}

/**
 * Checkout adapter interface
 * Each platform must implement this interface
 */
export interface CheckoutAdapter {
  /**
   * Platform identifier
   */
  readonly source: CheckoutSource;

  /**
   * Fetch orders from the platform
   */
  getOrders(params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    orders: any[];
    meta?: {
      current_page: number;
      total_pages: number;
      total_count: number;
    };
  }>;

  /**
   * Fetch all orders with pagination
   */
  getAllOrders(params?: {
    start_date?: string;
    end_date?: string;
    maxPages?: number;
  }): Promise<any[]>;

  /**
   * Transform platform-specific order to unified format
   */
  transformOrder(platformOrder: any): UnifiedOrder;

  /**
   * Validate webhook signature (if supported)
   */
  validateWebhook?(payload: any, signature: string): boolean;

  /**
   * Parse webhook payload to unified order
   */
  parseWebhook?(payload: any): UnifiedOrder | null;
}

/**
 * Sync result for monitoring
 */
export interface SyncResult {
  source: CheckoutSource;
  totalOrders: number;
  syncedOrders: number;
  failedBatches: number;
  retries: number;
  duration: number; // seconds
  startedAt: string;
  completedAt: string;
  errors?: Array<{
    batch: number;
    error: string;
  }>;
}

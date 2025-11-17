/**
 * CartPanda Checkout Adapter
 *
 * Implements CheckoutAdapter interface for CartPanda API v3
 */

import { cartPandaClient } from '../cartpanda/client';
import type { CartPandaOrder } from '../cartpanda/types';
import type { CheckoutAdapter, UnifiedOrder } from './types';

export class CartPandaAdapter implements CheckoutAdapter {
  readonly source = 'cartpanda' as const;

  /**
   * Fetch orders from CartPanda API
   */
  async getOrders(params: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
  }) {
    const response = await cartPandaClient.getOrders(params);

    return {
      orders: response.orders,
      meta: response.meta,
    };
  }

  /**
   * Fetch all orders with pagination
   */
  async getAllOrders(params?: {
    start_date?: string;
    end_date?: string;
    maxPages?: number;
  }) {
    return await cartPandaClient.getAllOrders(params);
  }

  /**
   * Transform CartPanda order to unified format
   */
  transformOrder(order: CartPandaOrder): UnifiedOrder {
    return {
      // Multi-checkout fields
      source: 'cartpanda',
      source_order_id: order.id.toString(),
      raw_payload: order, // Store complete API response

      // Common fields (already compatible)
      id: order.id,
      order_number: order.order_number,
      status_id: order.status_id,
      financial_status: order.financial_status,
      payment_status: order.payment_status,

      // Pricing
      currency: order.currency,
      total_price: order.total_price,
      subtotal_price: order.subtotal_price,
      current_total_discounts: order.current_total_discounts,
      local_currency_amount: order.local_currency_amount,
      exchange_rate_usd: order.exchange_rate_USD || null,

      // Customer
      customer: order.customer,

      // Line items
      line_items: order.line_items,

      // Payment
      payment: order.payment,

      // Affiliate
      afid: order.afid,
      affiliate_name: order.affiliate_name,
      affiliate_email: order.affiliate_email,
      affiliate_slug: order.affiliate_slug,
      affiliate_amount: order.affiliate_amount,

      // Refunds & chargebacks
      refunds: order.refunds,
      chargeback_received: order.chargeback_received,
      chargeback_at: order.chargeback_at,

      // Timestamps
      created_at: order.created_at,
      updated_at: order.updated_at,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * CartPanda webhooks use custom headers for validation
   */
  validateWebhook(payload: any, signature: string): boolean {
    // CartPanda webhook validation (to be implemented when webhook is configured)
    // For now, return true (validation happens in webhook route)
    return true;
  }

  /**
   * Parse CartPanda webhook payload
   */
  parseWebhook(payload: any): UnifiedOrder | null {
    try {
      // CartPanda sends order data in 'order' field
      const order = payload.order || payload;

      if (!order || !order.id) {
        return null;
      }

      return this.transformOrder(order as CartPandaOrder);
    } catch (error) {
      console.error('Failed to parse CartPanda webhook:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cartPandaAdapter = new CartPandaAdapter();

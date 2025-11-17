/**
 * Digistore24 Checkout Adapter (TEMPLATE)
 *
 * Implements CheckoutAdapter interface for Digistore24 API
 *
 * TODO: Complete implementation when Digistore24 account is available
 *
 * Reference: https://www.digistore24.com/en/api/order
 */

import crypto from 'crypto';
import type { CheckoutAdapter, UnifiedOrder } from './types';

export class Digistore24Adapter implements CheckoutAdapter {
  readonly source = 'digistore24' as const;

  private apiUrl: string;
  private apiKey: string;
  private webhookSecret: string;

  constructor() {
    this.apiUrl = process.env.DIGISTORE24_API_URL || 'https://www.digistore24.com/api';
    this.apiKey = process.env.DIGISTORE24_API_KEY || '';
    this.webhookSecret = process.env.DIGISTORE24_WEBHOOK_SECRET || '';
  }

  /**
   * Fetch orders from Digistore24 API
   *
   * TODO: Implement using Digistore24 API documentation
   */
  async getOrders(params: {
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
  }> {
    // TODO: Implement Digistore24 API call
    // GET https://www.digistore24.com/api/orders?api_key=xxx&...

    throw new Error('Digistore24 adapter not yet implemented - waiting for API access');

    /*
    Example implementation:

    const queryParams = new URLSearchParams({
      api_key: this.apiKey,
      page: params.page?.toString() || '1',
      per_page: params.per_page?.toString() || '50',
      ...(params.start_date && { start_date: params.start_date }),
      ...(params.end_date && { end_date: params.end_date }),
    });

    const response = await fetch(`${this.apiUrl}/orders?${queryParams}`);
    const data = await response.json();

    return {
      orders: data.data || [],
      meta: {
        current_page: data.current_page || 1,
        total_pages: data.total_pages || 1,
        total_count: data.total || 0,
      },
    };
    */
  }

  /**
   * Fetch all orders with pagination
   */
  async getAllOrders(params?: {
    start_date?: string;
    end_date?: string;
    maxPages?: number;
  }): Promise<any[]> {
    // TODO: Implement pagination logic similar to CartPanda
    throw new Error('Digistore24 adapter not yet implemented - waiting for API access');
  }

  /**
   * Transform Digistore24 order to unified format
   *
   * Based on Digistore24 IPN structure:
   * https://www.digistore24.com/en/api/ipn
   */
  transformOrder(digiOrder: any): UnifiedOrder {
    // TODO: Map Digistore24 fields to unified structure
    // This is a template based on common IPN fields

    return {
      // Multi-checkout fields
      source: 'digistore24',
      source_order_id: digiOrder.order_id || digiOrder.transaction_id,
      raw_payload: digiOrder,

      // Order basics
      id: parseInt(digiOrder.order_id) || 0, // Will need proper ID generation
      order_number: digiOrder.order_id,
      status_id: this.mapStatus(digiOrder.payment_status),
      financial_status: this.mapFinancialStatus(digiOrder.payment_status),
      payment_status: this.mapPaymentStatus(digiOrder.payment_status),

      // Pricing
      currency: digiOrder.currency || 'EUR',
      total_price: digiOrder.order_total_value || '0',
      subtotal_price: digiOrder.order_total_value || '0',
      current_total_discounts: '0',
      local_currency_amount: digiOrder.order_total_value_usd || '0',
      exchange_rate_usd: null,

      // Customer
      customer: {
        id: 0, // Digistore doesn't provide customer ID
        email: digiOrder.buyer_email || '',
        first_name: digiOrder.billing_first_name || '',
        last_name: digiOrder.billing_last_name || '',
        phone: digiOrder.billing_phone || '',
      },

      // Line items (Digistore uses different structure)
      line_items: this.transformLineItems(digiOrder),

      // Payment
      payment: {
        id: 0,
        gateway: digiOrder.payment_method || 'unknown',
        type: digiOrder.payment_method || 'unknown',
        payment_type: digiOrder.payment_method || 'unknown',
        status_id: this.mapPaymentStatus(digiOrder.payment_status),
        amount: parseFloat(digiOrder.order_total_value || '0'),
      },

      // Affiliate (Digistore has built-in affiliate system)
      afid: digiOrder.affiliate_id || null,
      affiliate_name: null, // Not provided in IPN
      affiliate_email: null, // Not provided in IPN
      affiliate_slug: '',
      affiliate_amount: digiOrder.affiliate_earnings || '0',

      // Refunds & chargebacks
      refunds: digiOrder.is_refunded ? [{ amount: digiOrder.order_total_value }] : null,
      chargeback_received: digiOrder.is_chargeback ? 1 : 0,
      chargeback_at: null,

      // Timestamps
      created_at: digiOrder.created_at || new Date().toISOString(),
      updated_at: digiOrder.updated_at || new Date().toISOString(),
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Validate Digistore24 webhook using SHA512 signature
   *
   * Reference: https://www.digistore24.com/en/api/ipn#security
   */
  validateWebhook(payload: any, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('Digistore24 webhook secret not configured');
      return false;
    }

    try {
      // Digistore24 uses SHA512 signature
      const hash = crypto
        .createHmac('sha512', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('Digistore24 webhook validation error:', error);
      return false;
    }
  }

  /**
   * Parse Digistore24 IPN payload
   */
  parseWebhook(payload: any): UnifiedOrder | null {
    try {
      // Digistore24 sends form-encoded data or JSON
      if (!payload || !payload.order_id) {
        return null;
      }

      return this.transformOrder(payload);
    } catch (error) {
      console.error('Failed to parse Digistore24 webhook:', error);
      return null;
    }
  }

  // Helper methods for status mapping

  private mapStatus(paymentStatus: string): string {
    const statusMap: Record<string, string> = {
      paid: 'paid',
      pending: 'pending',
      refunded: 'refunded',
      chargeback: 'chargeback',
    };

    return statusMap[paymentStatus?.toLowerCase()] || 'unknown';
  }

  private mapFinancialStatus(paymentStatus: string): number {
    // Map to CartPanda-compatible status codes
    const statusMap: Record<string, number> = {
      paid: 3,
      pending: 1,
      refunded: 4,
      chargeback: 5,
    };

    return statusMap[paymentStatus?.toLowerCase()] || 0;
  }

  private mapPaymentStatus(paymentStatus: string): number {
    // Same as financial status for Digistore24
    return this.mapFinancialStatus(paymentStatus);
  }

  private transformLineItems(digiOrder: any): any[] {
    // Digistore24 can have multiple products
    // TODO: Map actual product structure when API docs are available
    return [
      {
        id: 0,
        product_id: parseInt(digiOrder.product_id) || 0,
        name: digiOrder.product_name || '',
        title: digiOrder.product_name || '',
        quantity: 1,
        price: parseFloat(digiOrder.order_total_value || '0'),
        total_price: digiOrder.order_total_value || '0',
      },
    ];
  }
}

// Export singleton instance
export const digistore24Adapter = new Digistore24Adapter();

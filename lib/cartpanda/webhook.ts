import crypto from 'crypto';
import { syncLogger } from '../logger';

/**
 * CartPanda Webhook Utilities
 *
 * Handles webhook signature validation and payload processing
 */

export interface CartPandaWebhookPayload {
  event: 'order.created' | 'order.updated' | 'order.paid' | 'order.refunded' | 'order.chargeback';
  order_id: number;
  order_number: string;
  timestamp: string;
  data: any; // Full order object
}

/**
 * Validate webhook HMAC signature
 *
 * CartPanda signs webhooks with HMAC-SHA256
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Compare signatures (constant time to prevent timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      syncLogger.warn('Webhook signature validation failed');
    }

    return isValid;
  } catch (error) {
    syncLogger.error('Error validating webhook signature', error);
    return false;
  }
}

/**
 * Parse and validate webhook payload
 */
export function parseWebhookPayload(body: any): CartPandaWebhookPayload | null {
  try {
    // Validate required fields
    if (!body.event || !body.order_id || !body.data) {
      syncLogger.warn('Invalid webhook payload: missing required fields');
      return null;
    }

    // Validate event type
    const validEvents = ['order.created', 'order.updated', 'order.paid', 'order.refunded', 'order.chargeback'];
    if (!validEvents.includes(body.event)) {
      syncLogger.warn(`Invalid webhook event type: ${body.event}`);
      return null;
    }

    return {
      event: body.event,
      order_id: body.order_id,
      order_number: body.order_number || body.data.order_number,
      timestamp: body.timestamp || new Date().toISOString(),
      data: body.data,
    };
  } catch (error) {
    syncLogger.error('Error parsing webhook payload', error);
    return null;
  }
}

/**
 * Check if webhook event should trigger sync
 */
export function shouldProcessWebhook(payload: CartPandaWebhookPayload): boolean {
  // Process all order events
  // Could add filtering logic here if needed (e.g., only paid orders)
  return true;
}

/**
 * Transform webhook order data to Supabase format
 */
export function transformWebhookOrder(webhookData: any) {
  return {
    id: webhookData.id,
    order_number: webhookData.order_number,
    status_id: webhookData.status_id,
    financial_status: webhookData.financial_status,
    payment_status: webhookData.payment_status,
    currency: webhookData.currency,
    total_price: webhookData.total_price,
    subtotal_price: webhookData.subtotal_price,
    current_total_discounts: webhookData.current_total_discounts,
    local_currency_amount: webhookData.local_currency_amount,
    exchange_rate_usd: webhookData.exchange_rate_USD || null,
    customer: webhookData.customer,
    line_items: webhookData.line_items,
    payment: webhookData.payment,
    afid: webhookData.afid || null,
    affiliate_name: webhookData.affiliate_name || null,
    affiliate_email: webhookData.affiliate_email || null,
    affiliate_slug: webhookData.affiliate_slug || '',
    affiliate_amount: webhookData.affiliate_amount || '0',
    refunds: webhookData.refunds || null,
    chargeback_received: webhookData.chargeback_received || 0,
    chargeback_at: webhookData.chargeback_at || null,
    created_at: webhookData.created_at,
    updated_at: webhookData.updated_at,
    synced_at: new Date().toISOString(),
  };
}

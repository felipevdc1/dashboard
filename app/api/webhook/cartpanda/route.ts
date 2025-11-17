import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { syncLogger } from '@/lib/logger';
import {
  validateWebhookSignature,
  parseWebhookPayload,
  shouldProcessWebhook,
  transformWebhookOrder,
} from '@/lib/cartpanda/webhook';

const WEBHOOK_SECRET = process.env.CARTPANDA_WEBHOOK_SECRET;

/**
 * CartPanda Webhook Endpoint
 *
 * Receives real-time notifications when orders are created/updated
 * Syncs data instantly to Supabase
 *
 * Setup in CartPanda dashboard:
 * URL: https://your-domain.vercel.app/api/webhook/cartpanda
 * Events: order.created, order.updated, order.paid, order.refunded, order.chargeback
 */
export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] === New webhook request received ===');

  try {
    // Get raw body for signature validation
    console.log('[WEBHOOK] Step 1: Reading request body...');
    const rawBody = await request.text();
    console.log('[WEBHOOK] Raw body length:', rawBody.length);

    const body = JSON.parse(rawBody);
    console.log('[WEBHOOK] Step 2: Parsed JSON body');
    console.log('[WEBHOOK] Payload keys:', Object.keys(body).join(', '));
    console.log('[WEBHOOK] Full payload:', JSON.stringify(body, null, 2));

    // Validate HMAC signature (if secret is configured)
    if (WEBHOOK_SECRET) {
      console.log('[WEBHOOK] Step 3: Validating HMAC signature...');
      const signature = request.headers.get('x-cartpanda-signature') || '';
      const isValid = validateWebhookSignature(rawBody, signature, WEBHOOK_SECRET);

      if (!isValid) {
        console.log('[WEBHOOK] ERROR: Signature validation failed');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      console.log('[WEBHOOK] Signature validated successfully');
    } else {
      console.log('[WEBHOOK] Step 3: Skipping signature validation (no secret configured)');
    }

    // Parse and validate payload
    console.log('[WEBHOOK] Step 4: Parsing webhook payload...');
    const payload = parseWebhookPayload(body);

    if (!payload) {
      console.log('[WEBHOOK] ERROR: Payload validation failed');
      console.log('[WEBHOOK] Expected fields: event, order_id, data');
      console.log('[WEBHOOK] Received fields:', Object.keys(body).join(', '));
      return NextResponse.json(
        { error: 'Invalid payload', received_keys: Object.keys(body) },
        { status: 400 }
      );
    }

    console.log('[WEBHOOK] Payload validated:', {
      event: payload.event,
      order_id: payload.order_id,
      order_number: payload.order_number,
    });

    // Check if we should process this webhook
    if (!shouldProcessWebhook(payload)) {
      console.log('[WEBHOOK] Webhook skipped (shouldProcessWebhook = false)');
      return NextResponse.json({ status: 'skipped' });
    }

    // Transform order data
    console.log('[WEBHOOK] Step 5: Transforming order data...');
    const orderData = transformWebhookOrder(payload.data);
    console.log('[WEBHOOK] Transformed order data keys:', Object.keys(orderData).join(', '));

    // Upsert to Supabase
    console.log('[WEBHOOK] Step 6: Upserting to Supabase...');
    const { error: upsertError, data: upsertData } = await supabase
      .from('orders')
      .upsert(orderData as any, { onConflict: 'id' });

    if (upsertError) {
      console.log('[WEBHOOK] ERROR: Supabase upsert failed:', upsertError);
      throw upsertError;
    }
    console.log('[WEBHOOK] Upsert successful');

    // Log webhook event
    console.log('[WEBHOOK] Step 7: Logging webhook event...');
    try {
      await (supabase as any)
        .from('webhook_events')
        .insert({
          event_type: payload.event,
          order_id: payload.order_id,
          order_number: payload.order_number,
          payload: body,
          processed: true,
          processed_at: new Date().toISOString(),
        });
      console.log('[WEBHOOK] Event logged successfully');
    } catch (logError) {
      console.log('[WEBHOOK] WARNING: Failed to log webhook event:', logError);
    }

    console.log('[WEBHOOK] === Webhook processed successfully ===');

    return NextResponse.json({
      status: 'success',
      order_id: payload.order_id,
      event: payload.event,
    });

  } catch (error) {
    console.log('[WEBHOOK] === FATAL ERROR ===');
    console.log('[WEBHOOK] Error type:', typeof error);
    console.log('[WEBHOOK] Error instanceof Error:', error instanceof Error);
    console.log('[WEBHOOK] Error details:', error);

    if (error instanceof Error) {
      console.log('[WEBHOOK] Error message:', error.message);
      console.log('[WEBHOOK] Error stack:', error.stack);
    }

    // Log failed webhook attempt
    try {
      const body = await request.json();
      await (supabase as any)
        .from('webhook_events')
        .insert({
          event_type: body.event || 'unknown',
          order_id: body.order_id || null,
          order_number: body.order_number || null,
          payload: body,
          processed: false,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        });
    } catch (logError) {
      console.log('[WEBHOOK] ERROR: Could not log failed webhook:', logError);
    }

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : JSON.stringify(error),
        type: typeof error,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    webhook_url: '/api/webhook/cartpanda',
    supported_events: ['order.created', 'order.updated', 'order.paid', 'order.refunded', 'order.chargeback'],
  });
}

/**
 * Checkout Adapter Factory
 *
 * Central point for creating and managing checkout adapters
 */

import type { CheckoutAdapter, CheckoutSource } from './types';
import { cartPandaAdapter } from './cartpanda-adapter';
import { digistore24Adapter } from './digistore24-adapter';

/**
 * Get adapter for a specific checkout source
 */
export function getAdapter(source: CheckoutSource): CheckoutAdapter {
  switch (source) {
    case 'cartpanda':
      return cartPandaAdapter;

    case 'digistore24':
      return digistore24Adapter;

    default:
      throw new Error(`Unknown checkout source: ${source}`);
  }
}

/**
 * Get all available adapters
 */
export function getAllAdapters(): CheckoutAdapter[] {
  return [cartPandaAdapter, digistore24Adapter];
}

/**
 * Get all enabled adapters (adapters with valid configuration)
 */
export function getEnabledAdapters(): CheckoutAdapter[] {
  const adapters: CheckoutAdapter[] = [];

  // CartPanda is always enabled (required env vars)
  if (process.env.CARTPANDA_API_TOKEN) {
    adapters.push(cartPandaAdapter);
  }

  // Digistore24 is optional
  if (process.env.DIGISTORE24_API_KEY) {
    adapters.push(digistore24Adapter);
  }

  return adapters;
}

/**
 * Check if a source is enabled
 */
export function isSourceEnabled(source: CheckoutSource): boolean {
  switch (source) {
    case 'cartpanda':
      return !!process.env.CARTPANDA_API_TOKEN;

    case 'digistore24':
      return !!process.env.DIGISTORE24_API_KEY;

    default:
      return false;
  }
}

/**
 * Get adapter for webhook based on headers/payload
 */
export function getAdapterFromWebhook(
  headers: Record<string, string>,
  payload: any
): CheckoutAdapter | null {
  // CartPanda webhook detection
  if (headers['x-cartpanda-signature'] || payload.source === 'cartpanda') {
    return cartPandaAdapter;
  }

  // Digistore24 webhook detection
  if (headers['x-digistore-signature'] || payload.event_name) {
    return digistore24Adapter;
  }

  return null;
}

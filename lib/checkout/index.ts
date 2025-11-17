/**
 * Multi-Checkout Module
 *
 * Unified interface for multiple checkout platforms
 */

export * from './types';
export * from './adapter-factory';
export { cartPandaAdapter } from './cartpanda-adapter';
export { digistore24Adapter } from './digistore24-adapter';

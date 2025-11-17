/**
 * Advanced Retry Logic with Circuit Breaker
 *
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Selective retry (only 5xx errors)
 * - Detailed logging
 */

import { syncLogger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly failureThreshold: number;
  private readonly resetTimeout: number; // milliseconds

  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  isOpen(): boolean {
    // Auto-reset circuit after timeout
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.resetTimeout) {
        syncLogger.info('Circuit breaker: attempting to close (half-open state)');
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      }
    }

    return this.state === 'OPEN';
  }

  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      syncLogger.info('Circuit breaker: closed after successful retry');
      this.state = 'CLOSED';
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== 'OPEN') {
        syncLogger.warn(`Circuit breaker: OPENED after ${this.failureCount} failures`);
        this.state = 'OPEN';
      }
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Default retry condition: only retry 5xx errors and network errors
 */
function defaultShouldRetry(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP 5xx errors
  if (error.response?.status >= 500 && error.response?.status < 600) {
    return true;
  }

  // Cloudflare 524 timeout
  if (error.message?.includes('524')) {
    return true;
  }

  // Don't retry 4xx errors (client errors)
  return false;
}

/**
 * Execute function with retry logic
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  circuitBreaker?: CircuitBreaker
): Promise<T> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check circuit breaker
    if (circuitBreaker?.isOpen()) {
      throw new Error(
        `Circuit breaker OPEN - too many failures (${circuitBreaker.getFailureCount()} consecutive failures)`
      );
    }

    try {
      const result = await fn();

      // Success - record in circuit breaker
      circuitBreaker?.recordSuccess();

      if (attempt > 0) {
        syncLogger.info(`Operation succeeded after ${attempt} retries`);
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if should retry
      if (!shouldRetry(error)) {
        syncLogger.warn('Error not retryable', { error: error.message });
        throw error;
      }

      // No more retries left
      if (attempt === maxRetries) {
        syncLogger.error(`Max retries (${maxRetries}) exceeded`, { error: error.message });
        circuitBreaker?.recordFailure();
        throw error;
      }

      // Calculate backoff with jitter
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );

      // Add random jitter (0-30% of delay)
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delayMs = Math.floor(exponentialDelay + jitter);

      syncLogger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms`, {
        error: error.message,
        attempt: attempt + 1,
        delayMs,
      });

      // Call onRetry callback
      onRetry?.(attempt + 1, error);

      // Wait before retry
      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retryable version of a function
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions,
  circuitBreaker?: CircuitBreaker
): T {
  return (async (...args: any[]) => {
    return executeWithRetry(() => fn(...args), options, circuitBreaker);
  }) as T;
}

/**
 * Global circuit breaker instances
 */
export const globalCircuitBreakers = {
  supabase: new CircuitBreaker(5, 60000), // 5 failures, 1 min reset
  cartpanda: new CircuitBreaker(3, 30000), // 3 failures, 30 sec reset
  digistore24: new CircuitBreaker(3, 30000), // 3 failures, 30 sec reset (future)
};

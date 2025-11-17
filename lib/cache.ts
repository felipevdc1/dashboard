/**
 * Simple in-memory cache with TTL (Time To Live)
 * Perfect for caching API responses on the server
 */

import { cacheLogger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheMetadata<T> {
  data: T | null;
  cachedAt: number | null;  // Timestamp when cached
  expiresAt: number | null; // Timestamp when expires
  age: number | null;       // Age in milliseconds
  ttl: number | null;       // TTL in milliseconds
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.cache = new Map();
    this.cleanupInterval = null;

    // Start cleanup interval (runs every minute)
    if (typeof window === 'undefined') {
      // Only run on server
      this.startCleanup();
    }
  }

  /**
   * Get value from cache
   * Returns null if expired or not found
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      cacheLogger.debug(`Cache expired: ${key} (age: ${Math.round(age / 1000)}s)`);
      return null;
    }

    cacheLogger.debug(`Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data;
  }

  /**
   * Get value from cache with metadata (timestamp, age, ttl)
   * Returns metadata even if expired or not found
   */
  getWithMetadata<T>(key: string): CacheMetadata<T> {
    const entry = this.cache.get(key);

    if (!entry) {
      return {
        data: null,
        cachedAt: null,
        expiresAt: null,
        age: null,
        ttl: null,
      };
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const expiresAt = entry.timestamp + entry.ttl;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      cacheLogger.debug(`Cache expired: ${key} (age: ${Math.round(age / 1000)}s)`);
      return {
        data: null,
        cachedAt: null,
        expiresAt: null,
        age: null,
        ttl: null,
      };
    }

    cacheLogger.debug(`Cache hit with metadata: ${key} (age: ${Math.round(age / 1000)}s, expires in: ${Math.round((entry.ttl - age) / 1000)}s)`);

    return {
      data: entry.data,
      cachedAt: entry.timestamp,
      expiresAt,
      age,
      ttl: entry.ttl,
    };
  }

  /**
   * Set value in cache with TTL in milliseconds
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    cacheLogger.debug(`Cache set: ${key} (TTL: ${ttl / 1000}s)`);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      cacheLogger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    cacheLogger.debug('Cache cleared completely');
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        cacheLogger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 60 * 1000); // Run every minute
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    keys: string[];
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
    }));

    return {
      size: this.cache.size,
      keys: this.keys(),
      entries,
    };
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache();

// Export class for testing
export { MemoryCache };

/**
 * Helper to generate cache keys
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  return `${prefix}:${sortedParams}`;
}

/**
 * Decorator for caching function results
 */
export function cached<T>(
  keyGenerator: (...args: any[]) => string,
  ttl: number = 5 * 60 * 1000
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);

      // Try to get from cache
      const cached = memoryCache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      memoryCache.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

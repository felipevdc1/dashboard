import { NextResponse } from 'next/server';
import { calculateDashboardMetrics } from '@/lib/supabase/queries';
import { getComparisonPeriod } from '@/lib/dateUtils';
import { memoryCache, generateCacheKey } from '@/lib/cache';
import { metricsLogger, cacheLogger, logger } from '@/lib/logger';

// Cache configuration - reduced to 2 minutes for faster updates
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

// Remove force-dynamic to allow caching
// export const dynamic = 'force-dynamic';
export const revalidate = 120; // Revalidate every 2 minutes

export async function GET(request: Request) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);

    // Support both old period-based and new date-based queries
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period');
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    let currentStartDate: string;
    let currentEndDate: string;

    if (startDate && endDate) {
      // Use provided date range
      currentStartDate = startDate;
      currentEndDate = endDate;
    } else if (period) {
      // Use period-based (backwards compatible)
      const days = parseInt(period);
      currentEndDate = getDateString(0);
      currentStartDate = getDateString(days);
    } else {
      // Default to last 30 days
      currentEndDate = getDateString(0);
      currentStartDate = getDateString(30);
    }

    // Get comparison period for previous period
    const comparison = getComparisonPeriod(currentStartDate, currentEndDate);

    // Generate cache key based on date ranges
    const metricsCacheKey = generateCacheKey('supabase-metrics', {
      currentStart: currentStartDate,
      currentEnd: currentEndDate,
      previousStart: comparison.start,
      previousEnd: comparison.end,
    });

    // Force refresh: delete cache and fetch fresh data
    if (forceRefresh) {
      cacheLogger.debug('FORCE REFRESH - Bypassing cache');
      memoryCache.delete(metricsCacheKey);
    }

    // Try to get from cache first with metadata
    const cacheResult = memoryCache.getWithMetadata<{ metrics: any; activities: any }>(
      metricsCacheKey
    );
    let result = cacheResult.data;
    const cacheMetadata = {
      cachedAt: cacheResult.cachedAt,
      cacheAge: cacheResult.age,
      cacheExpiresIn: cacheResult.ttl && cacheResult.age ? cacheResult.ttl - cacheResult.age : null,
      cacheExpiresAt: cacheResult.expiresAt,
    };

    if (!result) {
      // Cache miss - fetch from Supabase
      metricsLogger.debug('Cache MISS - Fetching metrics from Supabase', {
        currentPeriod: `${currentStartDate} to ${currentEndDate}`,
        previousPeriod: `${comparison.start} to ${comparison.end}`,
      });

      result = await calculateDashboardMetrics(
        currentStartDate,
        currentEndDate,
        comparison.start,
        comparison.end
      );

      // Store in cache for 2 minutes
      memoryCache.set(metricsCacheKey, result, CACHE_TTL);

      // Update metadata for fresh data
      cacheMetadata.cachedAt = Date.now();
      cacheMetadata.cacheAge = 0;
      cacheMetadata.cacheExpiresIn = CACHE_TTL;
      cacheMetadata.cacheExpiresAt = Date.now() + CACHE_TTL;
    } else {
      cacheLogger.debug('Cache HIT - Using cached metrics');
    }

    const duration = Date.now() - startTime;
    metricsLogger.debug(`Request completed in ${duration}ms`);

    const response = NextResponse.json({
      metrics: result.metrics,
      activities: result.activities,
      lastUpdated: new Date().toISOString(),
      dateRange: {
        start: currentStartDate,
        end: currentEndDate,
      },
      cache: {
        cachedAt: cacheMetadata.cachedAt,
        age: cacheMetadata.cacheAge,
        expiresIn: cacheMetadata.cacheExpiresIn,
        expiresAt: cacheMetadata.cacheExpiresAt,
      },
      _meta: {
        cached: cacheResult.data !== null,
        duration,
        dataSource: 'supabase', // NEW: Shows data comes from Supabase
      },
    });

    // Add cache headers (2 minutes)
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=240');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=120');
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=120');

    return response;
  } catch (error) {
    metricsLogger.error('Error fetching metrics', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

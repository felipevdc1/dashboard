/**
 * GET /api/affiliates
 *
 * Returns list of affiliates with metrics, KPIs, and filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractLocalDate } from '@/lib/cartpanda/utils';
import { memoryCache } from '@/lib/cache';
import {
  processAffiliateMetrics,
  calculateGlobalKPIs,
  addRankingToAffiliates,
} from '@/lib/affiliates/utils';
import { affiliateLogger, cacheLogger, logger } from '@/lib/logger';
import type {
  AffiliatesResponse,
  AffiliateFilters,
  AffiliateMetrics,
} from '@/lib/affiliates/types';
import type { CartPandaOrder } from '@/lib/cartpanda/types';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;

    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const status = searchParams.get('status')?.split(',') || undefined;
    const qualityGrade = searchParams.get('quality_grade')?.split(',') || undefined;
    const minSales = searchParams.get('min_sales')
      ? parseInt(searchParams.get('min_sales')!)
      : undefined;
    const maxSales = searchParams.get('max_sales')
      ? parseInt(searchParams.get('max_sales')!)
      : undefined;
    const minRevenue = searchParams.get('min_revenue')
      ? parseFloat(searchParams.get('min_revenue')!)
      : undefined;
    const maxRevenue = searchParams.get('max_revenue')
      ? parseFloat(searchParams.get('max_revenue')!)
      : undefined;
    const minQualityScore = searchParams.get('min_quality_score')
      ? parseInt(searchParams.get('min_quality_score')!)
      : undefined;
    const maxQualityScore = searchParams.get('max_quality_score')
      ? parseInt(searchParams.get('max_quality_score')!)
      : undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sort_by') as AffiliateFilters['sortBy']) || 'revenue';
    const sortOrder = (searchParams.get('sort_order') as 'asc' | 'desc') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters: AffiliateFilters = {
      status: status as any,
      qualityGrade: qualityGrade as any,
      minSales,
      maxSales,
      minRevenue,
      maxRevenue,
      minQualityScore,
      maxQualityScore,
      search,
      sortBy,
      sortOrder,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    };

    // Create cache key
    const cacheKey = `affiliates:${JSON.stringify(filters)}:${page}:${limit}`;

    // Check cache
    const cached = memoryCache.get<AffiliatesResponse>(cacheKey);
    if (cached) {
      cacheLogger.debug(`Cache HIT for affiliates list`, { cacheKey });
      return NextResponse.json({
        ...cached,
        _meta: {
          ...cached._meta,
          cached: true,
        },
      });
    }

    cacheLogger.debug(`Cache MISS for affiliates list`, { cacheKey });

    // Fetch orders from Supabase (muito mais rápido que CartPanda API)
    let query = supabase
      .from('orders')
      .select('*');

    // Filter by date range if specified
    if (startDate && endDate) {
      query = query
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    const allOrders = (orders || []) as CartPandaOrder[];
    const filteredOrders = allOrders;

    affiliateLogger.debug(`Fetched ${allOrders.length} orders from Supabase`);

    // Debug: Count orders with each affiliate field
    const debugStats = {
      withAfid: filteredOrders.filter(o => o.afid).length,
      withSlug: filteredOrders.filter(o => o.affiliate_slug).length,
      withName: filteredOrders.filter(o => o.affiliate_name).length,
      withEmail: filteredOrders.filter(o => o.affiliate_email).length,
    };

    affiliateLogger.debug('Affiliate field statistics', debugStats);

    // Filter to only orders with affiliates (check all possible fields)
    const ordersWithAffiliates = filteredOrders.filter(
      order =>
        order.afid || order.affiliate_slug || order.affiliate_name || order.affiliate_email
    );

    affiliateLogger.debug(
      `${ordersWithAffiliates.length} orders have affiliates (${filteredOrders.length} total)`
    );

    // Process affiliate metrics
    const affiliateMap = processAffiliateMetrics(ordersWithAffiliates, {
      startDate: startDate || '',
      endDate: endDate || '',
    });

    let affiliates = Array.from(affiliateMap.values());

    // Apply filters
    if (filters.status && filters.status.length > 0) {
      affiliates = affiliates.filter(a => filters.status!.includes(a.status));
    }

    if (filters.qualityGrade && filters.qualityGrade.length > 0) {
      affiliates = affiliates.filter(a => filters.qualityGrade!.includes(a.quality.grade));
    }

    if (filters.minSales !== undefined) {
      affiliates = affiliates.filter(a => a.sales.total >= filters.minSales!);
    }

    if (filters.maxSales !== undefined) {
      affiliates = affiliates.filter(a => a.sales.total <= filters.maxSales!);
    }

    if (filters.minRevenue !== undefined) {
      affiliates = affiliates.filter(a => a.sales.revenue >= filters.minRevenue!);
    }

    if (filters.maxRevenue !== undefined) {
      affiliates = affiliates.filter(a => a.sales.revenue <= filters.maxRevenue!);
    }

    if (filters.minQualityScore !== undefined) {
      affiliates = affiliates.filter(a => a.quality.score >= filters.minQualityScore!);
    }

    if (filters.maxQualityScore !== undefined) {
      affiliates = affiliates.filter(a => a.quality.score <= filters.maxQualityScore!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      affiliates = affiliates.filter(
        a =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email.toLowerCase().includes(searchLower) ||
          a.slug.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    affiliates = affiliates.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (filters.sortBy) {
        case 'revenue':
          aValue = a.sales.revenue;
          bValue = b.sales.revenue;
          break;
        case 'sales':
          aValue = a.sales.total;
          bValue = b.sales.total;
          break;
        case 'quality':
          aValue = a.quality.score;
          bValue = b.quality.score;
          break;
        case 'commission':
          aValue = a.commissions.total;
          bValue = b.commissions.total;
          break;
        case 'growth':
          aValue = a.sales.growth;
          bValue = b.sales.growth;
          break;
        case 'avgTicket':
          aValue = a.sales.averageTicket;
          bValue = b.sales.averageTicket;
          break;
        default:
          aValue = a.sales.revenue;
          bValue = b.sales.revenue;
      }

      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // Add ranking
    affiliates = addRankingToAffiliates(affiliates);

    // Calculate KPIs
    const kpis = calculateGlobalKPIs(affiliates);

    // Pagination
    const total = affiliates.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedAffiliates = affiliates.slice(start, end);
    const hasMore = end < total;

    const duration = Date.now() - startTime;

    const response: AffiliatesResponse = {
      affiliates: paginatedAffiliates,
      kpis,
      filters,
      pagination: {
        total,
        page,
        limit,
        hasMore,
      },
      _meta: {
        cached: false,
        duration,
        timestamp: new Date().toISOString(),
      },
    };

    // Cache the response
    memoryCache.set(cacheKey, response);

    affiliateLogger.info(
      `Processed ${total} affiliates in ${duration}ms (page ${page}/${Math.ceil(total / limit)})`
    );

    return NextResponse.json(response);
  } catch (error) {
    affiliateLogger.error('Error fetching affiliates', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch affiliates',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

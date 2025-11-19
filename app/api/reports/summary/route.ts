/**
 * API Route: GET /api/reports/summary
 *
 * Retorna sumário agregado de refunds/chargebacks
 * Agrupado por canal, motivo, responsável
 * Com estatísticas de devolução
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReportSummary } from '@/lib/reports/queries';
import type { ReportFilters } from '@/lib/reports/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build filters from query params
    const filters: ReportFilters = {};

    // Tipo filter (refund or chargeback)
    if (searchParams.get('tipo')) {
      const tipo = searchParams.get('tipo');
      if (tipo === 'refund' || tipo === 'chargeback') {
        filters.tipo = tipo;
      }
    }

    // Date range filters
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')!;
    }
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')!;
    }

    // Affiliate filter
    if (searchParams.get('affiliate')) {
      filters.affiliate = searchParams.get('affiliate')!;
    }

    // Fetch summary data
    const { data, error } = await getReportSummary(filters);

    if (error) {
      console.error('Error fetching summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch summary', details: error.message },
        { status: 500 }
      );
    }

    // Sort aggregations by count (descending)
    const sortByCount = (obj: Record<string, { count: number; amount: number }>) => {
      return Object.entries(obj)
        .sort(([, a], [, b]) => b.count - a.count)
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {} as Record<string, { count: number; amount: number }>);
    };

    const sortedData = data
      ? {
          ...data,
          byCanal: sortByCount(data.byCanal),
          byMotivo: sortByCount(data.byMotivo),
          byResponsavel: sortByCount(data.byResponsavel),
        }
      : null;

    return NextResponse.json(
      { data: sortedData },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in /api/reports/summary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

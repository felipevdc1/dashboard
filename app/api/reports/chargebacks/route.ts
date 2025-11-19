/**
 * API Route: GET /api/reports/chargebacks
 *
 * Retorna lista de chargebacks com notas estruturadas
 * Suporta filtros por canal, motivo, responsável, período, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrdersWithNotes, getFilterOptions } from '@/lib/reports/queries';
import type { ReportFilters } from '@/lib/reports/queries';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build filters from query params
    const filters: ReportFilters = {
      tipo: 'chargeback', // Force chargeback type
    };

    // Canal filter
    if (searchParams.get('canal')) {
      filters.canal = searchParams.get('canal')!;
    }

    // Motivo filter
    if (searchParams.get('motivo')) {
      filters.motivo = searchParams.get('motivo')!;
    }

    // Responsável filter
    if (searchParams.get('responsavel')) {
      filters.responsavel = searchParams.get('responsavel')!;
    }

    // Devolveu filter
    if (searchParams.get('devolveu')) {
      filters.devolveu = searchParams.get('devolveu') === 'true';
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

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    filters.limit = limit;
    filters.offset = (page - 1) * limit;

    // Fetch data
    const { data, count, error } = await getOrdersWithNotes(filters);

    if (error) {
      console.error('Error fetching chargebacks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chargebacks', details: error.message },
        { status: 500 }
      );
    }

    // Fetch filter options for dropdowns
    const filterOptions = await getFilterOptions('chargeback');

    return NextResponse.json(
      {
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
        filters: filterOptions,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, s-maxage=120, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('Unexpected error in /api/reports/chargebacks:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

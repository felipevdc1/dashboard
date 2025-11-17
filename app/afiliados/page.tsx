/**
 * Affiliates Page
 *
 * Main page for the affiliates analytics module
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { AffiliatesResponse, AffiliateFilters } from '@/lib/affiliates/types';
import type { DateRange } from '@/lib/dateUtils';
import { getTodayRange } from '@/lib/dateUtils';
import AffiliateKPICards from '@/components/AffiliateKPICards';
import AffiliateRankingTable from '@/components/AffiliateRankingTable';
import AffiliateFiltersBar from '@/components/AffiliateFiltersBar';
import AffiliateDetailsModal from '@/components/AffiliateDetailsModal';
import DateRangePicker from '@/components/DateRangePicker';

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

export default function AffiliatesPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getTodayRange());
  const [filters, setFilters] = useState<AffiliateFilters>({
    sortBy: 'revenue',
    sortOrder: 'desc',
  });
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);

  // Build API URL with filters
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      sort_by: filters.sortBy || 'revenue',
      sort_order: filters.sortOrder || 'desc',
    });

    if (filters.status && filters.status.length > 0) {
      params.append('status', filters.status.join(','));
    }

    if (filters.qualityGrade && filters.qualityGrade.length > 0) {
      params.append('quality_grade', filters.qualityGrade.join(','));
    }

    if (filters.search) {
      params.append('search', filters.search);
    }

    if (filters.minSales !== undefined) {
      params.append('min_sales', filters.minSales.toString());
    }

    if (filters.maxSales !== undefined) {
      params.append('max_sales', filters.maxSales.toString());
    }

    if (filters.minRevenue !== undefined) {
      params.append('min_revenue', filters.minRevenue.toString());
    }

    if (filters.maxRevenue !== undefined) {
      params.append('max_revenue', filters.maxRevenue.toString());
    }

    if (filters.minQualityScore !== undefined) {
      params.append('min_quality_score', filters.minQualityScore.toString());
    }

    if (filters.maxQualityScore !== undefined) {
      params.append('max_quality_score', filters.maxQualityScore.toString());
    }

    return `/api/affiliates?${params.toString()}`;
  };

  // Use SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR<AffiliatesResponse>(
    buildApiUrl(),
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
      revalidateOnFocus: true,
      dedupingInterval: 30000,
      errorRetryCount: 3,
    }
  );

  const handleRefresh = () => {
    mutate(undefined, { revalidate: true });
  };

  const handleResetFilters = () => {
    setFilters({
      sortBy: 'revenue',
      sortOrder: 'desc',
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Dados</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Erro desconhecido'}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Carregando afiliados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-2xl">
                  👥
                </div>
                <h1 className="text-3xl md:text-4xl font-bold">
                  <span className="gradient-text">Análise de Afiliados</span>
                </h1>
              </div>
              <p className="text-gray-400 text-lg">
                Performance completa e insights detalhados
              </p>
            </div>

            <div className="flex items-center gap-3">
              <DateRangePicker value={dateRange} onChange={setDateRange} />

              <button
                onClick={handleRefresh}
                className="glass glass-hover rounded-xl px-5 py-3 text-sm font-medium flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <span className="text-lg">🔄</span>
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>

          {/* Meta info bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            {data._meta && (
              <div className="flex items-center gap-4">
                <div className={`px-3 py-1.5 rounded-full ${data._meta.cached ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'} flex items-center gap-2`}>
                  <span>{data._meta.cached ? '⚡' : '🌐'}</span>
                  <span className="font-medium">
                    {data._meta.cached ? 'Cache' : 'API'} • {data._meta.duration}ms
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-gray-800/50 text-gray-300 border border-gray-700 flex items-center gap-2">
                  <span>📊</span>
                  <span className="font-medium">
                    {data.pagination.total} afiliados
                  </span>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* KPI Cards */}
        <div className="mb-8 animate-slide-up">
          <AffiliateKPICards kpis={data.kpis} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 animate-slide-right">
            <AffiliateFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={handleResetFilters}
            />
          </div>

          {/* Table */}
          <div className="lg:col-span-3 animate-slide-left">
            {data.affiliates.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-bold mb-2">Nenhum afiliado encontrado</h3>
                <p className="text-gray-400 mb-6">
                  Não há afiliados com vendas no período selecionado.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors font-medium"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <AffiliateRankingTable
                affiliates={data.affiliates}
                onAffiliateClick={setSelectedAffiliateId}
              />
            )}
          </div>
        </div>

        {/* Details Modal */}
        <AffiliateDetailsModal
          affiliateId={selectedAffiliateId}
          dateRange={dateRange}
          onClose={() => setSelectedAffiliateId(null)}
        />
      </div>
    </div>
  );
}

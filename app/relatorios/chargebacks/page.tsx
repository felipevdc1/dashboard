'use client';

import { useState } from 'react';
import useSWR from 'swr';
import ReportFilters, { type FilterValues } from '@/components/reports/ReportFilters';
import ReportTable from '@/components/reports/ReportTable';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ChargebacksReportPage() {
  const [filters, setFilters] = useState<FilterValues>({});
  const [page, setPage] = useState(1);

  // Build query string from filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (filters.canal) params.set('canal', filters.canal);
    if (filters.motivo) params.set('motivo', filters.motivo);
    if (filters.responsavel) params.set('responsavel', filters.responsavel);
    if (filters.devolveu) params.set('devolveu', filters.devolveu);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.affiliate) params.set('affiliate', filters.affiliate);
    params.set('page', page.toString());
    params.set('limit', '50');
    return params.toString();
  };

  const { data, error, isLoading } = useSWR(
    `/api/reports/chargebacks?${buildQueryString()}`,
    fetcher,
    { refreshInterval: 0 }
  );

  const handleFiltersChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleApply = () => {
    // SWR will automatically refetch with new query string
  };

  const handleClear = () => {
    setFilters({});
    setPage(1);
  };

  const filterOptions = data?.filters || { canais: [], motivos: [], responsaveis: [] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Relatório de Chargebacks</h1>
          <p className="text-gray-400">
            Análise detalhada de chargebacks com notas estruturadas
          </p>
        </div>

        {/* Stats Summary */}
        {data?.pagination && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="glass rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Total de Registros</div>
              <div className="text-3xl font-bold text-white">
                {data.pagination.total.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Página Atual</div>
              <div className="text-3xl font-bold text-white">
                {data.pagination.page} / {data.pagination.totalPages}
              </div>
            </div>
            <div className="glass rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-1">Registros por Página</div>
              <div className="text-3xl font-bold text-white">{data.pagination.limit}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <ReportFilters
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={handleFiltersChange}
          onApply={handleApply}
          onClear={handleClear}
        />

        {/* Error State */}
        {error && (
          <div className="glass rounded-xl p-6 mb-6 border border-red-500/50">
            <p className="text-red-400">Erro ao carregar dados: {error.message}</p>
          </div>
        )}

        {/* Table */}
        <ReportTable data={data?.data || []} tipo="chargeback" loading={isLoading} />

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <div className="px-4 py-2 bg-gray-800 rounded-lg text-white">
              Página {page} de {data.pagination.totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

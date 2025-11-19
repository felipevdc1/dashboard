/**
 * Analytics Page
 *
 * Standalone analytics page with affiliate selector, date range, and export functionality
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import AffiliateSelector from '@/components/AffiliateSelector';
import DateRangePicker from '@/components/DateRangePicker';
import { formatCurrency, parsePrice } from '@/lib/cartpanda/utils';
import { exportAffiliateAnalytics } from '@/lib/export/affiliates';
import type { AffiliateMetrics, AffiliateAnalyticsResponse, AffiliateOrderItem } from '@/lib/affiliates/types';
import type { DateRange } from '@/lib/dateUtils';
import { getDateRangeByPreset } from '@/lib/dateUtils';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AnalyticsPage() {
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateMetrics | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeByPreset('this_month'));
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'refunded' | 'chargebacks' | 'pending'>('all');

  // Fetch analytics data
  const queryParams = new URLSearchParams({
    include_orders: 'true',
    page: String(currentPage),
    limit: '50',
  });

  if (dateRange.startDate && dateRange.endDate) {
    queryParams.append('start_date', dateRange.startDate);
    queryParams.append('end_date', dateRange.endDate);
  }

  const apiUrl = selectedAffiliateId
    ? `/api/affiliates/${selectedAffiliateId}?${queryParams.toString()}`
    : null;

  const { data, error, isLoading } = useSWR<AffiliateAnalyticsResponse>(apiUrl, fetcher);

  // Handle affiliate selection
  const handleAffiliateChange = (id: string | null, affiliate: AffiliateMetrics | null) => {
    setSelectedAffiliateId(id);
    setSelectedAffiliate(affiliate);
    setCurrentPage(1); // Reset to first page
  };

  // Handle export
  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!data || !selectedAffiliate) return;
    exportAffiliateAnalytics(data, selectedAffiliate.name, format);
  };

  // Filter orders by status
  const filteredOrders = data?.orders.filter((order: AffiliateOrderItem) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return order.financial_status === 3 && !order.refunds?.length && order.chargeback_received !== 1;
    if (statusFilter === 'refunded') return order.refunds && order.refunds.length > 0;
    if (statusFilter === 'chargebacks') return order.chargeback_received === 1;
    if (statusFilter === 'pending') return order.financial_status !== 3 && (!order.refunds || order.refunds.length === 0) && order.chargeback_received !== 1;
    return false;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>📈</span>
          Analytics de Afiliado
        </h1>
        <p className="text-gray-400 mt-1">
          Análise detalhada de desempenho e pedidos por afiliado
        </p>
      </div>

      {/* Filters Section */}
      <div className="glass rounded-2xl p-6 border border-gray-800/50 relative">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Affiliate Selector */}
          <div className="flex-1 min-w-[280px]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Selecionar Afiliado
            </label>
            <AffiliateSelector
              value={selectedAffiliateId}
              onChange={handleAffiliateChange}
            />
          </div>

          {/* Date Range Picker */}
          <div className="flex-1 min-w-[220px]">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Período
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>

          {/* Export Buttons */}
          {selectedAffiliateId && data && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>📄</span>
                <span>Exportar CSV</span>
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2"
              >
                <span>📊</span>
                <span>Exportar XLSX</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {!selectedAffiliateId && (
        <div className="glass rounded-2xl p-12 border border-gray-800/50 text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold mb-2">Selecione um afiliado</h2>
          <p className="text-gray-400">
            Escolha um afiliado acima para visualizar suas métricas e pedidos
          </p>
        </div>
      )}

      {selectedAffiliateId && isLoading && (
        <div className="glass rounded-2xl p-12 border border-gray-800/50 text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-current border-t-transparent rounded-full mb-4" />
          <p className="text-gray-400">Carregando dados...</p>
        </div>
      )}

      {selectedAffiliateId && error && (
        <div className="glass rounded-2xl p-12 border border-danger-500/50 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2 text-danger-400">Erro ao carregar dados</h2>
          <p className="text-gray-400">Não foi possível carregar os dados do afiliado.</p>
        </div>
      )}

      {selectedAffiliateId && data && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="glass glass-hover rounded-2xl p-6 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Receita Total</p>
                <p className="text-3xl font-bold gradient-text">
                  {formatCurrency(data.summary.revenue)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Comissão: <span className="text-warning-400 font-semibold">{formatCurrency(data.summary.commission)}</span>
                </p>
              </div>
            </div>

            {/* Card 2: Total Orders */}
            <div className="glass glass-hover rounded-2xl p-6 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Total de Pedidos</p>
                <p className="text-3xl font-bold">
                  {data.summary.total}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Ticket Médio: <span className="font-semibold">{formatCurrency(data.summary.total > 0 ? data.summary.revenue / data.summary.paid : 0)}</span>
                </p>
              </div>
            </div>

            {/* Card 3: Refunds */}
            <div className="glass glass-hover rounded-2xl p-6 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">↩️</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Reembolsos</p>
                <p className="text-3xl font-bold text-danger-400">
                  {data.summary.refunded}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {((data.summary.refunded / data.summary.total) * 100).toFixed(1)}% do total
                  <span className="block text-danger-400 font-semibold">
                    {formatCurrency(data.refunds.total)}
                  </span>
                </p>
              </div>
            </div>

            {/* Card 4: Chargebacks */}
            <div className="glass glass-hover rounded-2xl p-6 border border-gray-800/50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Chargebacks</p>
                <p className="text-3xl font-bold text-warning-400">
                  {data.summary.chargebacks}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {((data.summary.chargebacks / data.summary.total) * 100).toFixed(1)}% do total
                  <span className="block text-warning-400 font-semibold">
                    {formatCurrency(data.chargebacks.total)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="glass rounded-2xl p-6 border border-gray-800/50">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Pedidos</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {filteredOrders.length} pedidos
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'all', label: 'Todos', count: data.summary.total },
                  { key: 'paid', label: 'Pagos', count: data.summary.paid },
                  { key: 'refunded', label: 'Reembolsados', count: data.summary.refunded },
                  { key: 'chargebacks', label: 'Chargebacks', count: data.summary.chargebacks },
                  { key: 'pending', label: 'Pendentes', count: data.summary.pending },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setStatusFilter(filter.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === filter.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Pedido</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Data</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Cliente</th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Produto</th>
                    <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Valor</th>
                    <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        Nenhum pedido encontrado
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map((order: AffiliateOrderItem) => (
                    <tr key={order.id} className="border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm">{order.order_number || order.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-400">
                          {new Date(order.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            order.financial_status === 3 && !order.refunds?.length && order.chargeback_received !== 1
                              ? 'bg-success-500/10 text-success-400'
                              : order.refunds && order.refunds.length > 0
                              ? 'bg-danger-500/10 text-danger-400'
                              : order.chargeback_received === 1
                              ? 'bg-warning-500/10 text-warning-400'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-sm font-semibold">
                            {order.customer.first_name} {order.customer.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{order.customer.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-xs">
                          {order.line_items.map((item, idx) => (
                            <div key={idx} className="text-sm truncate">
                              {item.quantity}x {item.title}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-semibold">{formatCurrency(parsePrice(order.total_price))}</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-warning-400 font-semibold">
                          {formatCurrency(parsePrice(order.affiliate_amount || '0'))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.total > data.pagination.limit && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Mostrando {Math.min((currentPage - 1) * data.pagination.limit + 1, data.pagination.total)} - {Math.min(currentPage * data.pagination.limit, data.pagination.total)} de {data.pagination.total} pedidos
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!data.pagination.hasMore}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

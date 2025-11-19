/**
 * Affiliate Analytics Page
 *
 * Detailed analytics view for individual affiliate performance
 * Shows orders, revenue, refunds, chargebacks, and other metrics
 */

'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import type { AffiliateAnalyticsResponse } from '@/lib/affiliates/types';
import type { DateRange } from '@/lib/dateUtils';
import { getThisMonthRange, formatDateRangeDisplay } from '@/lib/dateUtils';
import DateRangePicker from '@/components/DateRangePicker';
import { formatCurrency, parsePrice } from '@/lib/shared/utils';

// Fetcher function for SWR
const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function AffiliateAnalyticsPage({ params }: PageProps) {
  const { slug } = use(params);
  const [dateRange, setDateRange] = useState<DateRange>(getThisMonthRange());
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'refunded' | 'chargebacks' | 'pending'>('all');

  // Build API URL with date range and pagination
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      include_orders: 'true',
      page: currentPage.toString(),
      limit: '50',
    });

    return `/api/affiliates/${slug}?${params.toString()}`;
  };

  // Use SWR for data fetching
  const { data, error, isLoading, mutate } = useSWR<AffiliateAnalyticsResponse>(
    buildApiUrl(),
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
      revalidateOnFocus: true,
      dedupingInterval: 30000,
    }
  );

  const handleRefresh = () => {
    mutate(undefined, { revalidate: true });
  };

  // Filter orders based on status filter
  const filteredOrders = data?.orders.filter(order => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'paid') return order.financial_status === 3;
    if (statusFilter === 'refunded') return order.refunds && order.refunds.length > 0;
    if (statusFilter === 'chargebacks') return order.chargeback_received === 1;
    if (statusFilter === 'pending') {
      return order.financial_status !== 3 &&
             (!order.refunds || order.refunds.length === 0) &&
             order.chargeback_received !== 1;
    }
    return true;
  }) || [];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Dados</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Erro desconhecido'}</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/afiliados"
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Voltar
            </Link>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Carregando analytics do afiliado...</p>
        </div>
      </div>
    );
  }

  const { affiliate, summary, refunds, chargebacks, pagination } = data;

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
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/afiliados"
              className="glass glass-hover rounded-xl p-3 hover:scale-105 transition-transform"
            >
              <span className="text-xl">←</span>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    <span className="gradient-text">{affiliate.name}</span>
                  </h1>
                  <p className="text-gray-400 text-sm">{affiliate.email}</p>
                </div>
              </div>
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
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {data._meta && (
              <>
                <div className={`px-3 py-1.5 rounded-full ${data._meta.cached ? 'bg-success-500/10 text-success-400 border border-success-500/20' : 'bg-primary-500/10 text-primary-400 border border-primary-500/20'} flex items-center gap-2`}>
                  <span>{data._meta.cached ? '⚡' : '🌐'}</span>
                  <span className="font-medium">
                    {data._meta.cached ? 'Cache' : 'API'} • {data._meta.duration}ms
                  </span>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-gray-800/50 text-gray-300 border border-gray-700">
                  <span className="font-medium">
                    📅 {formatDateRangeDisplay(dateRange.startDate, dateRange.endDate, dateRange.preset)}
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success-500/10 flex items-center justify-center text-xl">
                ✅
              </div>
              <div className="text-sm text-gray-400">Pedidos Pagos</div>
            </div>
            <div className="text-3xl font-bold mb-1">{summary.paid}</div>
            <div className="text-sm text-success-400">
              {formatCurrency(summary.revenue)}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center text-xl">
                💰
              </div>
              <div className="text-sm text-gray-400">Comissão</div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(summary.commission)}
            </div>
            <div className="text-sm text-gray-400">
              {summary.revenue > 0
                ? `${((summary.commission / summary.revenue) * 100).toFixed(1)}% da receita`
                : '0%'}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-warning-500/10 flex items-center justify-center text-xl">
                ↩️
              </div>
              <div className="text-sm text-gray-400">Reembolsos</div>
            </div>
            <div className="text-3xl font-bold mb-1">{refunds.count}</div>
            <div className="text-sm text-warning-400">
              {formatCurrency(refunds.total)}
            </div>
          </div>

          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-error-500/10 flex items-center justify-center text-xl">
                ⚠️
              </div>
              <div className="text-sm text-gray-400">Chargebacks</div>
            </div>
            <div className="text-3xl font-bold mb-1">{chargebacks.count}</div>
            <div className="text-sm text-error-400">
              {formatCurrency(chargebacks.total)}
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="glass rounded-2xl p-4 mb-6 animate-slide-up">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              Todos ({summary.total})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'paid'
                  ? 'bg-success-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              Pagos ({summary.paid})
            </button>
            <button
              onClick={() => setStatusFilter('refunded')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'refunded'
                  ? 'bg-warning-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              Reembolsos ({summary.refunded})
            </button>
            <button
              onClick={() => setStatusFilter('chargebacks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'chargebacks'
                  ? 'bg-error-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              Chargebacks ({summary.chargebacks})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
            >
              Pendentes ({summary.pending})
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass rounded-2xl overflow-hidden animate-slide-up">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold">Pedidos ({filteredOrders.length})</h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-2xl font-bold mb-2">Nenhum pedido encontrado</h3>
              <p className="text-gray-400">
                Não há pedidos {statusFilter !== 'all' && `com status "${statusFilter}"`} no período selecionado.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Pedido</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Data</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Cliente</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Produtos</th>
                      <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-400">Valor</th>
                      <th className="text-right p-4 text-sm font-medium text-gray-400">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredOrders.map((order) => {
                      const isPaid = order.financial_status === 3;
                      const isRefunded = order.refunds && order.refunds.length > 0;
                      const isChargeback = order.chargeback_received === 1;

                      let statusColor = 'bg-gray-700 text-gray-300';
                      let statusText = 'Pendente';
                      if (isRefunded) {
                        statusColor = 'bg-warning-500/10 text-warning-400 border border-warning-500/20';
                        statusText = 'Reembolsado';
                      } else if (isChargeback) {
                        statusColor = 'bg-error-500/10 text-error-400 border border-error-500/20';
                        statusText = 'Chargeback';
                      } else if (isPaid) {
                        statusColor = 'bg-success-500/10 text-success-400 border border-success-500/20';
                        statusText = 'Pago';
                      }

                      return (
                        <tr key={order.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="p-4">
                            <div className="font-medium">#{order.order_number}</div>
                          </td>
                          <td className="p-4 text-sm text-gray-400">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <div className="font-medium">
                                {order.customer.first_name} {order.customer.last_name}
                              </div>
                              <div className="text-gray-400 text-xs">{order.customer.email}</div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-400">
                            {order.line_items.length} item{order.line_items.length !== 1 ? 's' : ''}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-4 text-right font-medium">
                            {formatCurrency(parsePrice(order.total_price))}
                          </td>
                          <td className="p-4 text-right text-primary-400 font-medium">
                            {formatCurrency(parsePrice(order.affiliate_amount || '0'))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.hasMore && (
                <div className="p-6 border-t border-gray-800 flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Mostrando {filteredOrders.length} de {pagination.total} pedidos
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <div className="px-4 py-2 rounded-lg bg-primary-600 font-medium">
                      {currentPage}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => p + 1)}
                      disabled={!pagination.hasMore}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

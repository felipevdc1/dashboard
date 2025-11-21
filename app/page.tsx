'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import type { DashboardMetrics, RecentActivity } from '@/lib/cartpanda/types';
import type { DateRange } from '@/lib/dateUtils';
import { getTodayRange } from '@/lib/dateUtils';
import StatCard from '@/components/StatCard';
import RevenueChart from '@/components/RevenueChart';
import TopProducts from '@/components/TopProducts';
import AffiliatesTable from '@/components/AffiliatesTable';
import RefundChargebackCards from '@/components/RefundChargebackCards';
import ActivityFeed from '@/components/ActivityFeed';
import DateRangePicker from '@/components/DateRangePicker';
import { formatCurrency, formatNumber } from '@/lib/cartpanda/utils';

type DashboardData = {
  metrics: DashboardMetrics;
  activities: RecentActivity[];
  lastUpdated: string;
  cache?: {
    cachedAt: number | null;
    age: number | null;
    expiresIn: number | null;
    expiresAt: number | null;
  };
  _meta?: {
    cached: boolean;
    duration: number;
    ordersTotal: number;
    ordersFiltered: number;
  };
};

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// Custom hook for cache countdown timer
function useCacheTimer(expiresAt: number | null | undefined) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return {
    timeLeft,
    formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
    isExpiringSoon: timeLeft < 30000, // Less than 30 seconds
    isExpiring: timeLeft < 60000, // Less than 1 minute
  };
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>(getTodayRange());
  const [isSyncing, setIsSyncing] = useState(false);

  // Use SWR for data fetching with automatic cache
  const { data, error, isLoading, mutate } = useSWR<DashboardData>(
    `/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`,
    fetcher,
    {
      refreshInterval: 30 * 60 * 1000, // Auto-refresh every 30 minutes
      revalidateOnFocus: false, // Don't revalidate on focus (cache is long)
      dedupingInterval: 30000, // Dedupe requests within 30 seconds
      errorRetryCount: 3, // Retry 3 times on error
    }
  );

  const cacheTimer = useCacheTimer(data?.cache?.expiresAt);

  const fetchDashboardData = () => {
    mutate(undefined, { revalidate: true }); // Force revalidation, bypass cache
  };

  const forceRefreshData = async () => {
    setIsSyncing(true);

    try {
      // Step 1: Trigger incremental sync (last 24 hours)
      const syncResponse = await fetch('/api/sync/incremental', {
        method: 'POST',
      });

      const syncResult = await syncResponse.json();

      if (!syncResult.success) {
        throw new Error(syncResult.message || 'Sync failed');
      }

      // Step 2: Refresh dashboard data with force_refresh to bypass cache
      const url = `/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}&force_refresh=true`;
      await mutate(fetch(url).then(res => res.json()), { revalidate: false });

      console.log('Incremental sync completed:', syncResult.stats);
    } catch (error) {
      console.error('Force refresh failed:', error);
      // Still try to refresh data even if sync failed
      const url = `/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}&force_refresh=true`;
      await mutate(fetch(url).then(res => res.json()), { revalidate: false });
    } finally {
      setIsSyncing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Dados</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Erro desconhecido'}</p>
          <button
            onClick={fetchDashboardData}
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
          <p className="text-gray-400">Carregando dados...</p>
          {data?._meta && (
            <p className="text-xs text-gray-500 mt-2">
              {data._meta.cached ? '⚡ Cache' : '🌐 API'} • {data._meta.duration}ms
            </p>
          )}
        </div>
      </div>
    );
  }

  const { metrics, activities, lastUpdated } = data;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Dashboard <span className="gradient-text">Beliuim Caps</span>
              </h1>
              <p className="text-gray-400">
                Performance da operação em tempo real
              </p>
            </div>

            <div className="flex items-center gap-4">
              <DateRangePicker value={dateRange} onChange={setDateRange} />

              {/* Cache timer */}
              {data?.cache?.expiresIn && cacheTimer.timeLeft > 0 && (
                <div className={`glass rounded-lg px-3 py-2 text-xs flex items-center gap-2 ${
                  cacheTimer.isExpiringSoon ? 'text-green-400' : cacheTimer.isExpiring ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  <span>⏱️</span>
                  <span>Expira em {cacheTimer.formatted}</span>
                </div>
              )}

              <button
                onClick={fetchDashboardData}
                className="glass glass-hover rounded-lg px-4 py-2 text-sm flex items-center gap-2"
                title="Revalidar dados (respeita cache se válido)"
              >
                <span>🔄</span> Atualizar
              </button>

              <button
                onClick={forceRefreshData}
                disabled={isSyncing}
                className={`glass glass-hover rounded-lg px-4 py-2 text-sm flex items-center gap-2 bg-primary-600/20 hover:bg-primary-600/30 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSyncing ? 'animate-pulse' : ''
                }`}
                title="Sincronizar últimas 24h do CartPanda (rápido: ~2-5min)"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>
                  {isSyncing ? '🔄' : '⚡'}
                </span>
                {isSyncing ? 'Sincronizando...' : 'Forçar Sync'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
            <span>Última atualização: {new Date(lastUpdated).toLocaleString('pt-BR')}</span>
            {data._meta && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {data._meta.cached ? '⚡ Cache' : '🌐 API'}
                  <span className="text-gray-600">({data._meta.duration}ms)</span>
                </span>
                <span>•</span>
                <span className="text-gray-600">
                  {data._meta.ordersFiltered}/{data._meta.ordersTotal} pedidos
                </span>
              </>
            )}
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Receita Total"
            value={formatCurrency(metrics.revenue.total)}
            change={metrics.revenue.change}
            trend={metrics.revenue.trend}
            icon="💰"
            color="primary"
          />

          <StatCard
            title="Pedidos"
            value={metrics.orders.total.toString()}
            change={metrics.orders.change}
            trend={metrics.orders.trend}
            icon="📦"
            color="success"
          />

          <StatCard
            title="Ticket Médio"
            value={formatCurrency(metrics.averageTicket.value)}
            change={metrics.averageTicket.change}
            trend={metrics.averageTicket.trend}
            icon="💳"
            color="warning"
          />

          <StatCard
            title="Taxa de Perdas"
            subtitle={`rb ${metrics.lossRate.breakdown.refundRate.toFixed(1)}% | cb ${metrics.lossRate.breakdown.chargebackRate.toFixed(1)}%`}
            value={`${metrics.lossRate.value.toFixed(1)}%`}
            change={metrics.lossRate.change}
            trend={metrics.lossRate.trend}
            icon="⚠️"
            color="warning"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <RevenueChart data={metrics.monthlyComparison} />
          </div>

          <ActivityFeed activities={activities} />
        </div>

        {/* Products and Affiliates */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopProducts products={metrics.topProducts} />
          <AffiliatesTable affiliates={metrics.topAffiliates} />
        </div>

        {/* Refunds and Chargebacks */}
        <RefundChargebackCards
          refunds={metrics.refunds}
          chargebacks={metrics.chargebacks}
        />
      </div>
    </div>
  );
}

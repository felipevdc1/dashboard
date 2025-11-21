/**
 * Analytics Page: Refunds and Chargebacks
 *
 * Comprehensive analysis of refunds and chargebacks including:
 * - Timeline (by month)
 * - Cohort analysis (orders from month X that became rb/cb)
 * - Breakdown by affiliate
 * - Breakdown by product
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import RefundChargebackTimeline from '@/components/RefundChargebackTimeline';
import CohortAnalysisTable from '@/components/CohortAnalysisTable';
import LossRateByAffiliateTable from '@/components/LossRateByAffiliateTable';
import LossRateByProductTable from '@/components/LossRateByProductTable';
import type {
  TimelineDataPoint,
  CohortDataPoint,
  LossRateByEntity,
} from '@/lib/analytics/refunds-chargebacks';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type AnalyticsData = {
  timeline: TimelineDataPoint[];
  cohortAnalysis: CohortDataPoint[];
  byAffiliate: LossRateByEntity[];
  byProduct: LossRateByEntity[];
  _meta: {
    months: number;
    ordersTotal: number;
    duration: number;
  };
};

export default function RefundsChargebacksAnalyticsPage() {
  const [months, setMonths] = useState(12);

  // Fetch analytics data
  const { data, error, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics/refunds-chargebacks?months=${months}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="glass rounded-2xl p-8 max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Erro ao Carregar Dados</h2>
          <p className="text-gray-400 mb-6">{error.message || 'Erro desconhecido'}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-400">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>📊</span>
          Analytics de Reembolsos e Chargebacks
        </h1>
        <p className="text-gray-400 mt-1">
          Análise completa de perdas: timeline, cohort, breakdown por afiliado e produto
        </p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-gray-300">
            Período:
          </label>
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="glass-input px-4 py-2 rounded-lg bg-white/5 border border-gray-800 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          >
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Últimos 12 meses</option>
            <option value="24">Últimos 24 meses</option>
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {data._meta.ordersTotal} pedidos • {data._meta.duration}ms
        </div>
      </div>

      {/* Timeline Chart */}
      <RefundChargebackTimeline data={data.timeline} />

      {/* Cohort Analysis Table */}
      <CohortAnalysisTable data={data.cohortAnalysis} />

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LossRateByAffiliateTable data={data.byAffiliate} limit={10} />
        <LossRateByProductTable data={data.byProduct} limit={10} />
      </div>
    </div>
  );
}

/**
 * Affiliate KPI Cards Component
 *
 * Displays 6 main KPI cards for the affiliates module:
 * - Total Affiliates
 * - Active Affiliates
 * - Total Revenue
 * - Total Commissions
 * - Average Commission Rate
 * - Average Quality Score
 */

import type { AffiliateKPIs } from '@/lib/affiliates/types';
import { formatCurrency } from '@/lib/cartpanda/utils';
import StatCard from './StatCard';

interface AffiliateKPICardsProps {
  kpis: AffiliateKPIs;
}

export default function AffiliateKPICards({ kpis }: AffiliateKPICardsProps) {
  // Calculate percentages for display
  const activePercentage =
    kpis.totalAffiliates > 0 ? (kpis.activeAffiliates / kpis.totalAffiliates) * 100 : 0;

  const newPercentage =
    kpis.totalAffiliates > 0 ? (kpis.newAffiliates / kpis.totalAffiliates) * 100 : 0;

  // Generate dummy trend data for sparklines (TODO: Replace with real historical data)
  const dummyTrend = [5, 8, 12, 9, 15, 18, 20];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Total Affiliates */}
      <StatCard
        title="Total de Afiliados"
        value={kpis.totalAffiliates.toString()}
        change={newPercentage}
        trend={dummyTrend}
        icon="👥"
        color="primary"
      />

      {/* Active Affiliates */}
      <StatCard
        title="Afiliados Ativos"
        value={kpis.activeAffiliates.toString()}
        change={activePercentage}
        trend={dummyTrend}
        icon="⚡"
        color="success"
      />

      {/* Total Revenue */}
      <StatCard
        title="Receita Total"
        value={formatCurrency(kpis.totalRevenue)}
        change={0} // TODO: Calculate with comparison period
        trend={dummyTrend}
        icon="💰"
        color="primary"
      />

      {/* Total Commissions */}
      <StatCard
        title="Comissões Pagas"
        value={formatCurrency(kpis.totalCommissions)}
        change={0} // TODO: Calculate with comparison period
        trend={dummyTrend}
        icon="💸"
        color="warning"
      />

      {/* Average Commission Rate */}
      <StatCard
        title="Taxa Média de Comissão"
        value={`${kpis.averageCommissionRate.toFixed(1)}%`}
        change={0} // TODO: Calculate with comparison period
        trend={dummyTrend}
        icon="📊"
        color="primary"
      />

      {/* Average Quality Score */}
      <StatCard
        title="Score Médio de Qualidade"
        value={kpis.averageQualityScore.toFixed(0)}
        change={0} // TODO: Calculate with comparison period
        trend={dummyTrend}
        icon="⭐"
        color={kpis.averageQualityScore >= 80 ? 'success' : kpis.averageQualityScore >= 60 ? 'warning' : 'primary'}
      />
    </div>
  );
}

/**
 * Get quality grade text based on score
 */
function getQualityGradeText(score: number): string {
  if (score >= 90) return 'Excelente (A)';
  if (score >= 80) return 'Muito Bom (B)';
  if (score >= 70) return 'Bom (C)';
  if (score >= 60) return 'Regular (D)';
  return 'Ruim (F)';
}

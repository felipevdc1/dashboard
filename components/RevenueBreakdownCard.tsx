/**
 * Revenue Breakdown Card Component
 *
 * Shows both gross and net revenue with expandable breakdown section
 * Option C: Expandable layout - clean default view with details on demand
 */

'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/shared/utils';

type RevenueBreakdownCardProps = {
  grossRevenue: number;
  netRevenue: number;
  refundsTotal: number;
  chargebacksTotal: number;
  commission: number;
};

export default function RevenueBreakdownCard({
  grossRevenue,
  netRevenue,
  refundsTotal,
  chargebacksTotal,
  commission,
}: RevenueBreakdownCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const difference = grossRevenue - netRevenue;
  const retentionRate = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
  const commissionRate = netRevenue > 0 ? (commission / netRevenue) * 100 : 0;

  return (
    <div className="glass glass-hover rounded-2xl p-6 border border-gray-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-3xl">💰</span>
        <div className="text-xs text-gray-500">
          Retenção: {retentionRate.toFixed(1)}%
        </div>
      </div>

      {/* Title */}
      <div className="mb-4">
        <p className="text-sm text-gray-400 mb-3">Receita</p>

        {/* Main Values: Gross → Net */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold truncate">
              {formatCurrency(grossRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Bruta (todas as vendas)</p>
          </div>

          <div className="text-gray-600 text-lg flex-shrink-0">→</div>

          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold gradient-text truncate">
              {formatCurrency(netRevenue)}
            </p>
            <p className="text-xs text-success-400 mt-1">Líquida (efetiva)</p>
          </div>
        </div>

        {/* Difference Indicator */}
        {difference > 0 && (
          <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-gray-800/30">
            <span className="text-gray-400">Descontos totais</span>
            <span className="text-warning-400 font-semibold">
              -{formatCurrency(difference)}
            </span>
          </div>
        )}
      </div>

      {/* Expandable Breakdown Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-xs text-gray-400 hover:text-gray-300 transition-colors flex items-center justify-between py-2 border-t border-gray-800/50"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm">{isExpanded ? '▼' : '▶'}</span>
          Ver detalhamento
        </span>
      </button>

      {/* Expanded Breakdown Section */}
      {isExpanded && (
        <div className="mt-3 space-y-2 text-xs border-t border-gray-800/30 pt-3 animate-fade-in">
          {/* Gross Revenue */}
          <div className="flex justify-between py-1">
            <span className="text-gray-400">Receita Bruta</span>
            <span className="font-semibold">{formatCurrency(grossRevenue)}</span>
          </div>

          {/* Refunds */}
          {refundsTotal > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-warning-400">- Reembolsos</span>
              <span className="text-warning-400 font-semibold">
                -{formatCurrency(refundsTotal)}
              </span>
            </div>
          )}

          {/* Chargebacks */}
          {chargebacksTotal > 0 && (
            <div className="flex justify-between py-1">
              <span className="text-danger-400">- Chargebacks</span>
              <span className="text-danger-400 font-semibold">
                -{formatCurrency(chargebacksTotal)}
              </span>
            </div>
          )}

          {/* Net Revenue (Result) */}
          <div className="flex justify-between pt-2 border-t border-gray-800/30 font-semibold py-1">
            <span className="text-success-400">= Receita Líquida</span>
            <span className="text-success-400">{formatCurrency(netRevenue)}</span>
          </div>

          {/* Commission */}
          <div className="flex justify-between pt-2 border-t border-gray-800/30 mt-2 py-1">
            <span className="text-gray-400">Comissão do afiliado</span>
            <span className="text-warning-400 font-semibold">
              {formatCurrency(commission)} ({commissionRate.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

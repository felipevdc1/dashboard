/**
 * Affiliate Details Modal Component
 *
 * Displays detailed information about a specific affiliate in a modal/drawer
 */

'use client';

import { useEffect, useState } from 'react';
import type { AffiliateDetails } from '@/lib/affiliates/types';
import { formatCurrency } from '@/lib/cartpanda/utils';

interface AffiliateDetailsModalProps {
  affiliateId: string | null;
  dateRange: { startDate: string; endDate: string };
  onClose: () => void;
}

export default function AffiliateDetailsModal({
  affiliateId,
  dateRange,
  onClose,
}: AffiliateDetailsModalProps) {
  const [details, setDetails] = useState<AffiliateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!affiliateId) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/affiliates/${affiliateId}?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch affiliate details');
        }

        const data = await response.json();
        setDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [affiliateId, dateRange]);

  if (!affiliateId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 glass border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {details?.name || 'Carregando...'}
            </h2>
            <p className="text-gray-400 text-sm">{details?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
          )}

          {error && (
            <div className="bg-danger-500/20 border border-danger-500 rounded-lg p-4 text-danger-400">
              {error}
            </div>
          )}

          {details && !isLoading && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SummaryCard
                  label="Vendas"
                  value={details.sales.total.toString()}
                  icon="📦"
                />
                <SummaryCard
                  label="Receita"
                  value={formatCurrency(details.sales.revenue)}
                  icon="💰"
                />
                <SummaryCard
                  label="Comissão"
                  value={formatCurrency(details.commissions.total)}
                  icon="💸"
                />
                <SummaryCard
                  label="Qualidade"
                  value={`${details.quality.score} (${details.quality.grade})`}
                  icon="⭐"
                />
              </div>

              {/* Quality Metrics */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Métricas de Qualidade</h3>
                <div className="grid grid-cols-3 gap-4">
                  <MetricItem
                    label="Taxa de Aprovação"
                    value={`${details.quality.approvalRate.toFixed(1)}%`}
                  />
                  <MetricItem
                    label="Taxa de Reembolso"
                    value={`${details.quality.refundRate.toFixed(1)}%`}
                  />
                  <MetricItem
                    label="Taxa de Chargeback"
                    value={`${details.quality.chargebackRate.toFixed(1)}%`}
                  />
                </div>
              </div>

              {/* Product Breakdown */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Produtos Mais Vendidos</h3>
                {details.productBreakdown.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum produto vendido</p>
                ) : (
                  <div className="space-y-2">
                    {details.productBreakdown.slice(0, 5).map((product, index) => (
                      <div
                        key={product.productId}
                        className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 font-mono text-sm">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="font-medium">{product.productName}</div>
                            <div className="text-xs text-gray-500">
                              {product.sales} vendas •{' '}
                              {product.percentage.toFixed(1)}% do total
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(product.revenue)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(product.commission)} comissão
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Timeline de Atividades</h3>
                {details.timeline.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhuma atividade registrada</p>
                ) : (
                  <div className="space-y-3">
                    {details.timeline.slice(0, 10).map((entry, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="text-2xl">{getTimelineIcon(entry.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{entry.description}</div>
                            {entry.amount && (
                              <div className="font-semibold">
                                {formatCurrency(entry.amount)}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(entry.date).toLocaleString('pt-BR')}
                            {entry.productName && ` • ${entry.productName}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Temporal Stats */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Estatísticas Temporais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricItem
                    label="Primeira Venda"
                    value={new Date(details.temporal.firstSale).toLocaleDateString(
                      'pt-BR'
                    )}
                  />
                  <MetricItem
                    label="Última Venda"
                    value={new Date(details.temporal.lastSale).toLocaleDateString(
                      'pt-BR'
                    )}
                  />
                  <MetricItem
                    label="Dias Ativos"
                    value={details.temporal.daysActive.toString()}
                  />
                  <MetricItem
                    label="Média entre Vendas"
                    value={`${details.temporal.averageDaysBetweenSales} dias`}
                  />
                </div>
              </div>

              {/* Activity Patterns */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-lg font-bold mb-3">Padrões de Atividade</h3>
                <div className="grid grid-cols-3 gap-4">
                  <MetricItem
                    label="Dia de Pico"
                    value={translateDay(details.activity.peakDay)}
                  />
                  <MetricItem
                    label="Hora de Pico"
                    value={`${details.activity.peakHour}:00`}
                  />
                  <MetricItem
                    label="Dias com Vendas"
                    value={details.activity.activeDays.toString()}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Summary Card Component
 */
function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

/**
 * Metric Item Component
 */
function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

/**
 * Get icon for timeline entry type
 */
function getTimelineIcon(type: string): string {
  const icons: Record<string, string> = {
    sale: '✅',
    refund: '↩️',
    chargeback: '⚠️',
    milestone: '🏆',
  };
  return icons[type] || '📌';
}

/**
 * Translate day name to Portuguese
 */
function translateDay(day: string): string {
  const days: Record<string, string> = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };
  return days[day] || day;
}

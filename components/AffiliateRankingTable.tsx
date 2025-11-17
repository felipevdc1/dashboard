/**
 * Affiliate Ranking Table Component
 *
 * Displays a sortable table of all affiliates with key metrics
 */

import type { AffiliateMetrics } from '@/lib/affiliates/types';
import { formatCurrency } from '@/lib/cartpanda/utils';

interface AffiliateRankingTableProps {
  affiliates: AffiliateMetrics[];
  onAffiliateClick: (affiliateId: string) => void;
}

export default function AffiliateRankingTable({
  affiliates,
  onAffiliateClick,
}: AffiliateRankingTableProps) {
  return (
    <div className="glass rounded-2xl p-6 border border-gray-800/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl">🏆</span>
            Ranking de Afiliados
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Clique em um afiliado para ver detalhes completos
          </p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Afiliado
              </th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Vendas
              </th>
              <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Receita
              </th>
              <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Ticket Médio
              </th>
              <th className="text-right py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Comissão
              </th>
              <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Qualidade
              </th>
              <th className="text-center py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Produtos
              </th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  Nenhum afiliado encontrado
                </td>
              </tr>
            ) : (
              affiliates.map((affiliate, index) => (
                <tr
                  key={affiliate.id}
                  onClick={() => onAffiliateClick(affiliate.id)}
                  className="border-b border-gray-800/30 hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-purple-500/5 cursor-pointer transition-all duration-200 group"
                >
                  {/* Rank */}
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/20' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-lg shadow-gray-500/20' :
                        index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-500/20' :
                        'bg-gray-800/50 text-gray-300'
                      }`}>
                        {index < 3 ? (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : affiliate.comparison.rank}
                      </div>
                      {affiliate.comparison.movement !== 0 && (
                        <div
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
                            affiliate.comparison.movement > 0
                              ? 'bg-success-500/10 text-success-400'
                              : 'bg-danger-500/10 text-danger-400'
                          }`}
                        >
                          {affiliate.comparison.movement > 0 ? '↑' : '↓'}
                          {Math.abs(affiliate.comparison.movement)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {affiliate.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold group-hover:text-primary-400 transition-colors">
                          {affiliate.name}
                        </div>
                        <div className="text-xs text-gray-500">{affiliate.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <StatusBadge status={affiliate.status} />
                  </td>

                  {/* Sales */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-semibold">{affiliate.sales.total}</div>
                  </td>

                  {/* Revenue */}
                  <td className="py-4 px-4 text-right">
                    <div className="font-semibold">
                      {formatCurrency(affiliate.sales.revenue)}
                    </div>
                  </td>

                  {/* Average Ticket */}
                  <td className="py-4 px-4 text-right">
                    <div className="text-gray-400">
                      {formatCurrency(affiliate.sales.averageTicket)}
                    </div>
                  </td>

                  {/* Commission */}
                  <td className="py-4 px-4 text-right">
                    <div>
                      <div className="font-semibold text-warning-400">
                        {formatCurrency(affiliate.commissions.total)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {affiliate.commissions.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </td>

                  {/* Quality Score */}
                  <td className="py-4 px-4">
                    <div className="flex flex-col items-center">
                      <QualityBadge
                        score={affiliate.quality.score}
                        grade={affiliate.quality.grade}
                      />
                    </div>
                  </td>

                  {/* Products */}
                  <td className="py-4 px-4 text-center">
                    <div className="text-gray-400">{affiliate.products.total}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {affiliates.length > 0 && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          Mostrando {affiliates.length} afiliados
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: 'active' | 'inactive' | 'new' }) {
  const config = {
    active: {
      label: 'Ativo',
      color: 'bg-success-500/10 text-success-400 border border-success-500/30',
      icon: '✓'
    },
    inactive: {
      label: 'Inativo',
      color: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
      icon: '○'
    },
    new: {
      label: 'Novo',
      color: 'bg-primary-500/10 text-primary-400 border border-primary-500/30',
      icon: '★'
    },
  };

  const { label, color, icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

/**
 * Quality Badge Component
 */
function QualityBadge({ score, grade }: { score: number; grade: string }) {
  const getColorConfig = () => {
    if (score >= 90) return {
      bg: 'bg-gradient-to-br from-success-500 to-success-600',
      shadow: 'shadow-lg shadow-success-500/20',
      text: 'text-white',
      border: 'border-success-400'
    };
    if (score >= 80) return {
      bg: 'bg-gradient-to-br from-success-500/80 to-success-600/80',
      shadow: 'shadow-md shadow-success-500/15',
      text: 'text-white',
      border: 'border-success-500'
    };
    if (score >= 70) return {
      bg: 'bg-gradient-to-br from-warning-500 to-warning-600',
      shadow: 'shadow-md shadow-warning-500/15',
      text: 'text-white',
      border: 'border-warning-500'
    };
    if (score >= 60) return {
      bg: 'bg-gradient-to-br from-warning-600/80 to-warning-700/80',
      shadow: 'shadow-sm shadow-warning-500/10',
      text: 'text-white',
      border: 'border-warning-600'
    };
    return {
      bg: 'bg-gradient-to-br from-danger-500 to-danger-600',
      shadow: 'shadow-sm shadow-danger-500/10',
      text: 'text-white',
      border: 'border-danger-500'
    };
  };

  const config = getColorConfig();

  return (
    <div className={`inline-flex flex-col items-center justify-center w-16 h-16 rounded-xl ${config.bg} ${config.shadow} border ${config.border} ${config.text}`}>
      <div className="text-xl font-bold">{score}</div>
      <div className="text-xs font-semibold opacity-90">{grade}</div>
    </div>
  );
}

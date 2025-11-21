import { formatCurrency } from '@/lib/cartpanda/utils';
import type { CohortDataPoint } from '@/lib/analytics/refunds-chargebacks';

type CohortAnalysisTableProps = {
  data: CohortDataPoint[];
};

export default function CohortAnalysisTable({ data }: CohortAnalysisTableProps) {
  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Análise de Cohort</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📅</p>
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  // Format month label
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold">Análise de Cohort</h3>
        <p className="text-sm text-gray-400 mt-1">
          Pedidos criados em cada mês e seus respectivos reembolsos/chargebacks
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Mês Criação</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Total Pedidos</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Reembolsos</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Chargebacks</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Taxa Perda</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cohort, index) => (
              <tr
                key={cohort.month}
                className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="font-medium">{formatMonth(cohort.month)}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold">{cohort.totalOrders}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-warning-400">
                    {cohort.refunds.count} ({cohort.refunds.percentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(cohort.refunds.total)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-danger-400">
                    {cohort.chargebacks.count} ({cohort.chargebacks.percentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(cohort.chargebacks.total)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`font-bold text-lg ${
                    cohort.lossRate > 10 ? 'text-danger-400' :
                    cohort.lossRate > 5 ? 'text-warning-400' :
                    'text-success-400'
                  }`}>
                    {cohort.lossRate.toFixed(1)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

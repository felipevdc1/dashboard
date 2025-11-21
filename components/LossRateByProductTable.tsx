import { formatCurrency } from '@/lib/cartpanda/utils';
import type { LossRateByEntity } from '@/lib/analytics/refunds-chargebacks';

type LossRateByProductTableProps = {
  data: LossRateByEntity[];
  limit?: number;
};

export default function LossRateByProductTable({ data, limit = 10 }: LossRateByProductTableProps) {
  const displayData = limit ? data.slice(0, limit) : data;

  if (displayData.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Taxa de Perdas por Produto</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📦</p>
          <p>Nenhum produto encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold">Taxa de Perdas por Produto</h3>
        <p className="text-sm text-gray-400 mt-1">
          Ranking de produtos por taxa de reembolsos e chargebacks
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">#</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-300">Produto</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Vendas</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Reembolsos</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Chargebacks</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-300">Taxa Total</th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((product, index) => (
              <tr
                key={product.id}
                className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
              >
                <td className="py-3 px-4 text-gray-500 font-bold">
                  #{index + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium truncate max-w-xs">{product.name}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-semibold">{product.sales}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-warning-400">
                    {product.refunds.count} ({product.refunds.percentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(product.refunds.total)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="font-medium text-danger-400">
                    {product.chargebacks.count} ({product.chargebacks.percentage.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(product.chargebacks.total)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className={`font-bold text-lg ${
                    product.lossRate > 10 ? 'text-danger-400' :
                    product.lossRate > 5 ? 'text-warning-400' :
                    'text-success-400'
                  }`}>
                    {product.lossRate.toFixed(1)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {limit && data.length > limit && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Mostrando top {limit} de {data.length} produtos
        </div>
      )}
    </div>
  );
}

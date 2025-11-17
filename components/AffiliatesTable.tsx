import type { AffiliatePerformance } from '@/lib/cartpanda/types';
import { formatCurrency } from '@/lib/cartpanda/utils';

type AffiliatesTableProps = {
  affiliates: AffiliatePerformance[];
};

export default function AffiliatesTable({ affiliates }: AffiliatesTableProps) {
  if (affiliates.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Top Afiliados</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">👥</p>
          <p>Nenhum afiliado encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Top Afiliados</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header text-left text-xs text-gray-400">
              <th className="pb-3 font-semibold">Afiliado</th>
              <th className="pb-3 font-semibold text-center">Vendas</th>
              <th className="pb-3 font-semibold text-right">Receita</th>
              <th className="pb-3 font-semibold text-right">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.map((affiliate, index) => (
              <tr key={affiliate.id} className="table-row">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {affiliate.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {affiliate.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {affiliate.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 text-center">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-semibold">
                    {affiliate.sales}
                  </span>
                </td>
                <td className="py-3 text-right font-semibold text-sm">
                  {formatCurrency(affiliate.revenue)}
                </td>
                <td className="py-3 text-right">
                  <span className="text-success-400 font-semibold text-sm">
                    {formatCurrency(affiliate.commission)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

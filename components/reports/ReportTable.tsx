'use client';

import type { OrderWithNote } from '@/lib/reports/queries';

interface ReportTableProps {
  data: OrderWithNote[];
  tipo: 'refund' | 'chargeback';
  loading?: boolean;
}

export default function ReportTable({ data, tipo, loading }: ReportTableProps) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <p className="text-gray-400">Nenhum registro encontrado</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Pedido
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Canal
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Motivo
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                Responsável
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase">
                Devolveu
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.map((order) => (
              <tr key={order.id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-white font-mono text-sm">{order.order_number}</div>
                  {order.affiliate_name && (
                    <div className="text-xs text-gray-500 mt-1">
                      {order.affiliate_name}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-300 text-sm">
                    {formatDate(
                      tipo === 'refund'
                        ? order.refund_date || order.created_at
                        : order.chargeback_at || order.created_at
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-300 text-sm">{order.customer_name}</div>
                  <div className="text-xs text-gray-500 mt-1">{order.customer_email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300">
                    {order.canal || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm max-w-xs truncate">
                  {order.motivo || '-'}
                </td>
                <td className="px-4 py-3 text-gray-300 text-sm">
                  {order.responsavel || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  {order.devolveu === true && (
                    <span className="inline-block w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                      ✓
                    </span>
                  )}
                  {order.devolveu === false && (
                    <span className="inline-block w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                      ✗
                    </span>
                  )}
                  {order.devolveu === null && <span className="text-gray-600">-</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="text-white font-semibold">
                    {formatMoney(order.refund_amount || order.total_price || 0)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observações expandíveis podem ser adicionadas depois */}
    </div>
  );
}

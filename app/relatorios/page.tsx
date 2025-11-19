'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState<'refund' | 'chargeback' | ''>('');

  const { data: refundSummary } = useSWR('/api/reports/summary?tipo=refund', fetcher);
  const { data: chargebackSummary } = useSWR('/api/reports/summary?tipo=chargeback', fetcher);

  const summary = tipo === 'refund'
    ? refundSummary?.data
    : tipo === 'chargeback'
    ? chargebackSummary?.data
    : null;

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Prepare chart data for Canal
  const canalData = summary?.byCanal
    ? {
        labels: Object.keys(summary.byCanal),
        datasets: [
          {
            label: 'Quantidade',
            data: Object.values(summary.byCanal).map((v: any) => v.count),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
          },
        ],
      }
    : null;

  // Prepare chart data for Motivo
  const motivoData = summary?.byMotivo
    ? {
        labels: Object.keys(summary.byMotivo).slice(0, 5), // Top 5
        datasets: [
          {
            label: 'Quantidade',
            data: Object.values(summary.byMotivo)
              .slice(0, 5)
              .map((v: any) => v.count),
            backgroundColor: [
              'rgba(239, 68, 68, 0.5)',
              'rgba(251, 191, 36, 0.5)',
              'rgba(34, 197, 94, 0.5)',
              'rgba(59, 130, 246, 0.5)',
              'rgba(168, 85, 247, 0.5)',
            ],
            borderColor: [
              'rgba(239, 68, 68, 1)',
              'rgba(251, 191, 36, 1)',
              'rgba(34, 197, 94, 1)',
              'rgba(59, 130, 246, 1)',
              'rgba(168, 85, 247, 1)',
            ],
            borderWidth: 1,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard de Relatórios</h1>
          <p className="text-gray-400">
            Análise agregada de refunds e chargebacks com notas estruturadas
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/relatorios/reembolsos"
            className="glass rounded-xl p-6 hover:bg-blue-500/10 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Reembolsos</h3>
                <p className="text-gray-400">
                  {refundSummary?.data?.totalCount || 0} registros
                </p>
              </div>
              <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </Link>

          <Link
            href="/relatorios/chargebacks"
            className="glass rounded-xl p-6 hover:bg-red-500/10 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Chargebacks</h3>
                <p className="text-gray-400">
                  {chargebackSummary?.data?.totalCount || 0} registros
                </p>
              </div>
              <div className="text-4xl group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </Link>
        </div>

        {/* Tipo Selector */}
        <div className="glass rounded-xl p-6 mb-6">
          <label className="block text-sm text-gray-400 mb-3">Selecione o tipo para análise:</label>
          <div className="flex gap-3">
            <button
              onClick={() => setTipo('refund')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                tipo === 'refund'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Reembolsos
            </button>
            <button
              onClick={() => setTipo('chargeback')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                tipo === 'chargeback'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Chargebacks
            </button>
            <button
              onClick={() => setTipo('')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                tipo === ''
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="glass rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Total de Casos</div>
                <div className="text-3xl font-bold text-white">
                  {summary.totalCount.toLocaleString('pt-BR')}
                </div>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Valor Total</div>
                <div className="text-3xl font-bold text-white">
                  {formatMoney(summary.totalAmount)}
                </div>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="text-gray-400 text-sm mb-1">Taxa de Devolução</div>
                <div className="text-3xl font-bold text-white">
                  {summary.devolucaoRate.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Canal Chart */}
              {canalData && (
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Distribuição por Canal
                  </h3>
                  <Bar
                    data={canalData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: 'rgba(156, 163, 175, 1)' },
                          grid: { color: 'rgba(55, 65, 81, 0.3)' },
                        },
                        x: {
                          ticks: { color: 'rgba(156, 163, 175, 1)' },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              )}

              {/* Motivo Chart */}
              {motivoData && (
                <div className="glass rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Top 5 Motivos
                  </h3>
                  <Pie
                    data={motivoData}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: 'rgba(156, 163, 175, 1)' },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* By Canal */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Por Canal</h3>
                <div className="space-y-3">
                  {Object.entries(summary.byCanal || {})
                    .slice(0, 5)
                    .map(([canal, stats]: [string, any]) => (
                      <div key={canal} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm truncate mr-2">{canal}</span>
                        <div className="text-right">
                          <div className="text-white font-semibold">{stats.count}</div>
                          <div className="text-xs text-gray-500">
                            {formatMoney(stats.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* By Motivo */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Por Motivo</h3>
                <div className="space-y-3">
                  {Object.entries(summary.byMotivo || {})
                    .slice(0, 5)
                    .map(([motivo, stats]: [string, any]) => (
                      <div key={motivo} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm truncate mr-2">{motivo}</span>
                        <div className="text-right">
                          <div className="text-white font-semibold">{stats.count}</div>
                          <div className="text-xs text-gray-500">
                            {formatMoney(stats.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* By Responsável */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Por Responsável</h3>
                <div className="space-y-3">
                  {Object.entries(summary.byResponsavel || {})
                    .slice(0, 5)
                    .map(([responsavel, stats]: [string, any]) => (
                      <div key={responsavel} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm truncate mr-2">{responsavel}</span>
                        <div className="text-right">
                          <div className="text-white font-semibold">{stats.count}</div>
                          <div className="text-xs text-gray-500">
                            {formatMoney(stats.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!summary && tipo !== '' && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400">Carregando dados...</p>
          </div>
        )}

        {tipo === '' && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400">Selecione um tipo de relatório acima para ver a análise</p>
          </div>
        )}
      </div>
    </div>
  );
}

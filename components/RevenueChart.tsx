'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { MonthlyComparisonData } from '@/lib/cartpanda/types';
import { formatCurrency } from '@/lib/shared/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type RevenueChartProps = {
  data?: MonthlyComparisonData;
};

export default function RevenueChart({ data }: RevenueChartProps) {
  if (!data) {
    return (
      <div className="glass rounded-2xl p-6 h-96 flex items-center justify-center">
        <div className="loading-shimmer h-full w-full rounded-xl"></div>
      </div>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Receita Mês Atual (mês completo)',
        data: data.currentMonth.revenue,
        borderColor: 'rgba(14, 165, 233, 1)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
      {
        label: 'Receita Mês Anterior (mês completo)',
        data: data.previousMonth.revenue,
        borderColor: 'rgba(156, 163, 175, 0.7)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: 1,
        pointHoverRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgba(255, 255, 255, 1)',
        bodyColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 15,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: function (value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">
        Comparação Mensal: Receita
      </h3>
      <div style={{ height: '320px' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

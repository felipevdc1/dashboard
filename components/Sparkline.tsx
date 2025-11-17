'use client';

import { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';

// Register Chart.js components
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale);

type SparklineProps = {
  data: number[];
  color: 'primary' | 'success' | 'warning' | 'danger';
};

const colorMap = {
  primary: {
    line: 'rgba(14, 165, 233, 1)',
    gradient: ['rgba(14, 165, 233, 0.3)', 'rgba(14, 165, 233, 0)'],
  },
  success: {
    line: 'rgba(34, 197, 94, 1)',
    gradient: ['rgba(34, 197, 94, 0.3)', 'rgba(34, 197, 94, 0)'],
  },
  warning: {
    line: 'rgba(245, 158, 11, 1)',
    gradient: ['rgba(245, 158, 11, 0.3)', 'rgba(245, 158, 11, 0)'],
  },
  danger: {
    line: 'rgba(239, 68, 68, 1)',
    gradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0)'],
  },
};

export default function Sparkline({ data, color }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 40);
    gradient.addColorStop(0, colorMap[color].gradient[0]);
    gradient.addColorStop(1, colorMap[color].gradient[1]);

    // Create chart
    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i.toString()),
        datasets: [
          {
            data,
            borderColor: colorMap[color].line,
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        scales: {
          x: { display: false },
          y: { display: false },
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
        elements: {
          line: { borderWidth: 2 },
          point: { radius: 0 },
        },
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, color]);

  return (
    <div style={{ width: '80px', height: '40px' }}>
      <canvas
        ref={canvasRef}
        width={80}
        height={40}
        style={{ width: '80px', height: '40px' }}
      />
    </div>
  );
}

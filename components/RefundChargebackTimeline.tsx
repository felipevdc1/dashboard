import { formatCurrency } from '@/lib/cartpanda/utils';
import type { TimelineDataPoint } from '@/lib/analytics/refunds-chargebacks';

type RefundChargebackTimelineProps = {
  data: TimelineDataPoint[];
};

export default function RefundChargebackTimeline({ data }: RefundChargebackTimelineProps) {
  if (data.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Timeline de Reembolsos e Chargebacks</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📊</p>
          <p>Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  // Find max values for scaling
  const maxRefunds = Math.max(...data.map(d => d.refunds.count), 1);
  const maxChargebacks = Math.max(...data.map(d => d.chargebacks.count), 1);
  const maxValue = Math.max(maxRefunds, maxChargebacks);

  // Format month label
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Timeline de Reembolsos e Chargebacks</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning-500"></div>
            <span className="text-gray-400">Reembolsos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-danger-500"></div>
            <span className="text-gray-400">Chargebacks</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {data.map((point, index) => {
          const refundHeight = (point.refunds.count / maxValue) * 100;
          const chargebackHeight = (point.chargebacks.count / maxValue) * 100;

          return (
            <div key={point.month} className="group">
              <div className="flex items-center gap-4">
                {/* Month label */}
                <div className="w-16 text-sm text-gray-400 text-right">
                  {formatMonth(point.month)}
                </div>

                {/* Bars */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {/* Refunds bar */}
                  <div>
                    <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-warning-600 to-warning-400 transition-all duration-500"
                        style={{ width: `${refundHeight}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {point.refunds.count} • {formatCurrency(point.refunds.total)}
                    </div>
                  </div>

                  {/* Chargebacks bar */}
                  <div>
                    <div className="h-8 bg-white/5 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-danger-600 to-danger-400 transition-all duration-500"
                        style={{ width: `${chargebackHeight}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {point.chargebacks.count} • {formatCurrency(point.chargebacks.total)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

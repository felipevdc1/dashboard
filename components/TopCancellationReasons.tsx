import type { CancellationReason } from '@/lib/cartpanda/types';

type TopCancellationReasonsProps = {
  reasons: CancellationReason[];
};

export default function TopCancellationReasons({ reasons }: TopCancellationReasonsProps) {
  if (reasons.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Top Motivos de Cancelamento</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">✅</p>
          <p>Nenhum cancelamento registrado</p>
          <p className="text-xs mt-1">Ótimas notícias!</p>
        </div>
      </div>
    );
  }

  // Find max count for progress bar calculation
  const maxCount = Math.max(...reasons.map((r) => r.count));

  // Helper to get icon based on type
  const getTypeIcon = (tipo: string) => {
    if (tipo === 'refund') return '💸';
    if (tipo === 'chargeback') return '⚠️';
    return '🔄'; // both
  };

  // Helper to get color based on type
  const getTypeColor = (tipo: string) => {
    if (tipo === 'refund') return 'text-warning-400';
    if (tipo === 'chargeback') return 'text-danger-400';
    return 'text-gray-400'; // both
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Top Motivos de Cancelamento</h3>
        <span className="text-xs text-gray-500">Período selecionado</span>
      </div>

      <div className="space-y-4">
        {reasons.map((reason, index) => {
          const percentage = (reason.count / maxCount) * 100;

          return (
            <div key={reason.motivo} className="group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-xl font-bold text-gray-500 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{getTypeIcon(reason.tipo)}</span>
                      <h4 className="font-semibold text-sm truncate group-hover:text-primary-400 transition-colors">
                        {reason.motivo}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-400">
                      {reason.count} ocorrência{reason.count !== 1 ? 's' : ''} • {reason.percentage.toFixed(1)}%
                    </p>
                    {reason.tipo === 'both' && reason.refundCount && reason.chargebackCount && (
                      <p className="text-xs text-gray-500 mt-1">
                        💸 {reason.refundCount} reembolsos • ⚠️ {reason.chargebackCount} chargebacks
                      </p>
                    )}
                  </div>
                </div>

                <div className={`text-right flex-shrink-0 ml-4 ${getTypeColor(reason.tipo)}`}>
                  <p className="font-bold text-lg">
                    {reason.percentage.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    reason.tipo === 'refund'
                      ? 'bg-gradient-to-r from-warning-600 to-warning-400'
                      : reason.tipo === 'chargeback'
                      ? 'bg-gradient-to-r from-danger-600 to-danger-400'
                      : 'bg-gradient-to-r from-gray-600 to-gray-400'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

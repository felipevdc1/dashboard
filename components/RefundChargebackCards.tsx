type RefundChargebackData = {
  count: number;
  total: number;
  percentage: number;
};

type RefundChargebackCardsProps = {
  refunds: RefundChargebackData;
  chargebacks: RefundChargebackData;
};

export default function RefundChargebackCards({
  refunds,
  chargebacks,
}: RefundChargebackCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Refunds Card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-warning-500/10 flex items-center justify-center text-2xl">
            ↩️
          </div>
          <div>
            <h3 className="text-lg font-bold">Reembolsos</h3>
            <p className="text-xs text-gray-400">Total reembolsado no período</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-warning-400">
                {refunds.count}
              </p>
              <p className="text-xs text-gray-500 mt-1">solicitações</p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">
                {refunds.total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">valor total</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                Percentual da receita
              </span>
              <span className="text-sm font-semibold text-warning-400">
                {refunds.percentage.toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-warning-600 to-warning-400 rounded-full"
                style={{ width: `${Math.min(refunds.percentage, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chargebacks Card */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-danger-500/10 flex items-center justify-center text-2xl">
            ⚠️
          </div>
          <div>
            <h3 className="text-lg font-bold">Chargebacks</h3>
            <p className="text-xs text-gray-400">
              Contestações recebidas no período
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-danger-400">
                {chargebacks.count}
              </p>
              <p className="text-xs text-gray-500 mt-1">contestações</p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold">
                {chargebacks.total.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">valor total</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">
                Percentual da receita
              </span>
              <span className="text-sm font-semibold text-danger-400">
                {chargebacks.percentage.toFixed(2)}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-danger-600 to-danger-400 rounded-full"
                style={{
                  width: `${Math.min(chargebacks.percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

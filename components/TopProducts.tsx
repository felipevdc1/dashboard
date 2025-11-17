import type { ProductPerformance } from '@/lib/cartpanda/types';
import { formatCurrency } from '@/lib/cartpanda/utils';

type TopProductsProps = {
  products: ProductPerformance[];
};

export default function TopProducts({ products }: TopProductsProps) {
  if (products.length === 0) {
    return (
      <div className="glass rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Top Produtos</h3>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📦</p>
          <p>Nenhum produto encontrado</p>
        </div>
      </div>
    );
  }

  // Find max revenue for progress bar calculation
  const maxRevenue = Math.max(...products.map((p) => p.revenue));

  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Top Produtos</h3>

      <div className="space-y-4">
        {products.map((product, index) => {
          const percentage = (product.revenue / maxRevenue) * 100;

          return (
            <div key={product.id} className="group">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-xl font-bold text-gray-500 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm truncate group-hover:text-primary-400 transition-colors">
                      {product.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {product.sales} vendas
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-bold text-sm text-success-400">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-500"
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

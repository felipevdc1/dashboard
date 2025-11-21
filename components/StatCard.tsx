import Sparkline from './Sparkline';

type StatCardProps = {
  title: string;
  subtitle?: string; // Optional subtitle below value (e.g., breakdown)
  value: string;
  change: number;
  trend: number[];
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
};

const colorClasses = {
  primary: 'text-primary-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
  danger: 'text-danger-400',
};

export default function StatCard({
  title,
  subtitle,
  value,
  change,
  trend,
  icon,
  color,
}: StatCardProps) {
  const isPositive = change >= 0;
  const changeColor = isPositive ? 'text-success-400' : 'text-danger-400';

  return (
    <div className="glass glass-hover rounded-2xl p-6 stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <h3 className="text-2xl md:text-3xl font-bold">{value}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`text-3xl ${colorClasses[color]}`}>{icon}</div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${changeColor}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">vs período anterior</span>
        </div>

        <Sparkline data={trend} color={color} />
      </div>
    </div>
  );
}

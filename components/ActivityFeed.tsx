import type { RecentActivity } from '@/lib/cartpanda/types';
import { getRelativeTime, formatCurrency } from '@/lib/cartpanda/utils';

type ActivityFeedProps = {
  activities: RecentActivity[];
};

const activityIcons = {
  order: '✅',
  affiliate: '🤝',
  refund: '↩️',
  chargeback: '⚠️',
};

const activityColors = {
  order: 'border-l-success-500 bg-success-500/5',
  affiliate: 'border-l-blue-500 bg-blue-500/5',
  refund: 'border-l-warning-500 bg-warning-500/5',
  chargeback: 'border-l-danger-500 bg-danger-500/5',
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="glass rounded-2xl p-6">
      <h3 className="text-xl font-bold mb-6">Atividades Recentes</h3>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📭</p>
          <p>Nenhuma atividade recente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`activity-item p-4 rounded-xl border-l-4 ${
                activityColors[activity.type]
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {activityIcons[activity.type]}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">
                      {activity.title}
                    </h4>
                    {activity.type === 'order' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-success-500/20 text-success-400">
                        PAID
                      </span>
                    )}
                    {activity.type === 'refund' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-warning-500/20 text-warning-400">
                        REFUND
                      </span>
                    )}
                    {activity.type === 'chargeback' && (
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-danger-500/20 text-danger-400">
                        CHARGEBACK
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getRelativeTime(activity.timestamp)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-sm font-semibold ${
                      activity.type === 'order'
                        ? 'text-success-400'
                        : 'text-danger-400'
                    }`}
                  >
                    {activity.type === 'order' ? '+' : '-'}
                    {formatCurrency(activity.amount)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

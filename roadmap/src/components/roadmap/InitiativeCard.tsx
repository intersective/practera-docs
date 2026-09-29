import { Initiative } from '@/types/entities';
import { statusColor, statusLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface InitiativeCardProps {
  initiative: Initiative;
  compact?: boolean;
}

const categoryDots: Record<string, string> = {
  PLATFORM: 'bg-blue-500',
  ADMIN: 'bg-purple-500',
  APP: 'bg-green-500',
  MAINTENANCE: 'bg-gray-500',
  INFRA: 'bg-orange-500',
};

export function InitiativeCard({ initiative, compact = false }: InitiativeCardProps) {
  if (compact) {
    return (
      <div
        className={cn(
          'rounded px-2 py-1 text-xs text-white font-medium truncate cursor-default shadow-sm',
          statusColor(initiative.status),
        )}
        title={`${initiative.name} (${statusLabel(initiative.status)})`}
      >
        {initiative.name}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <div className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', statusColor(initiative.status))} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {initiative.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', categoryDots[initiative.category] ?? 'bg-gray-400')} />
            <span className="text-xs text-gray-500">{initiative.category}</span>
            {initiative.effort && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                {initiative.effort}
              </span>
            )}
            {initiative.jiraEpicKey && (
              <span className="text-xs text-blue-600">{initiative.jiraEpicKey}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

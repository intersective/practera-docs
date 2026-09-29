import { Capability } from '@/types/entities';
import { MaturityBadge, Badge } from '@/components/ui/Badge';
import { maturityColor } from '@/lib/utils';

interface CapabilityListProps {
  capabilities: Capability[];
  groupByCategory?: boolean;
}

const categoryOrder = ['auth', 'API', 'UI', 'data', 'AI', 'integration', 'infra', 'testing', 'devops'];

export function CapabilityList({ capabilities, groupByCategory = true }: CapabilityListProps) {
  if (capabilities.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No capabilities mapped yet. Run AI analysis to extract capabilities from this repo&apos;s CLAUDE.md.
      </p>
    );
  }

  if (!groupByCategory) {
    return (
      <div className="space-y-2">
        {capabilities.map((cap) => (
          <CapabilityRow key={cap.id} capability={cap} />
        ))}
      </div>
    );
  }

  const grouped = new Map<string, Capability[]>();
  for (const cap of capabilities) {
    const existing = grouped.get(cap.category) ?? [];
    existing.push(cap);
    grouped.set(cap.category, existing);
  }

  const sortedCategories = Array.from(grouped.keys()).sort(
    (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b),
  );

  return (
    <div className="space-y-4">
      {sortedCategories.map((category) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{category}</h4>
          <div className="space-y-2">
            {(grouped.get(category) ?? []).map((cap) => (
              <CapabilityRow key={cap.id} capability={cap} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CapabilityRow({ capability }: { capability: Capability }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{capability.name}</p>
            <MaturityBadge maturity={capability.maturity} />
          </div>
          {capability.description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{capability.description}</p>
          )}
          {capability.gaps && (
            <div className="mt-1.5 flex items-start gap-1">
              <span className="text-xs text-orange-600 font-medium flex-shrink-0">Gap:</span>
              <span className="text-xs text-orange-700 dark:text-orange-400">{capability.gaps}</span>
            </div>
          )}
          {capability.integrations && (
            <div className="mt-1 flex items-start gap-1">
              <span className="text-xs text-blue-600 font-medium flex-shrink-0">Integrates:</span>
              <span className="text-xs text-blue-700 dark:text-blue-400">{capability.integrations}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

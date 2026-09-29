'use client';

import { Application, Capability, Objective, Gap } from '@/types/entities';
import { severityColor } from '@/lib/utils';

interface GapMatrixProps {
  objectives: Objective[];
  applications: Application[];
  capabilities: Capability[];
  gaps: Gap[];
}

const severityShort: Record<string, { label: string; bg: string; text: string }> = {
  critical: { label: '!', bg: 'bg-red-500', text: 'text-white' },
  high: { label: 'H', bg: 'bg-orange-400', text: 'text-white' },
  medium: { label: 'M', bg: 'bg-yellow-400', text: 'text-gray-900' },
  low: { label: 'L', bg: 'bg-green-400', text: 'text-white' },
  none: { label: '✓', bg: 'bg-gray-100', text: 'text-gray-400' },
};

export function GapMatrix({ objectives, applications, capabilities, gaps }: GapMatrixProps) {
  if (objectives.length === 0 || applications.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Add objectives and run AI prioritization to see the gap matrix.
      </p>
    );
  }

  // Build a map: objectiveId → applicationId → gap severity
  const gapMap = new Map<string, string>();
  for (const gap of gaps) {
    const key = `${gap.objectiveId}:${gap.applicationId ?? 'global'}`;
    gapMap.set(key, gap.severity);
  }

  // Count capabilities per app
  const capsByApp = new Map<number, number>();
  for (const cap of capabilities) {
    capsByApp.set(cap.applicationId, (capsByApp.get(cap.applicationId) ?? 0) + 1);
  }

  const getCell = (objectiveId: number, applicationId: number): string => {
    return gapMap.get(`${objectiveId}:${applicationId}`) ?? gapMap.get(`${objectiveId}:global`) ?? 'none';
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 min-w-[180px]">
              Objective
            </th>
            {applications.map((app) => (
              <th
                key={app.id}
                className="px-2 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center"
                style={{ minWidth: '80px', maxWidth: '100px' }}
              >
                <div className="truncate" title={app.name}>
                  {app.name.replace('Practera ', '').replace(' App', '')}
                </div>
                <div className="text-gray-400 font-normal">{capsByApp.get(app.id) ?? 0} caps</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {objectives.map((obj) => (
            <tr key={obj.id} className="border-b border-gray-100 dark:border-gray-800">
              <td className="px-3 py-2 border border-gray-200 dark:border-gray-700">
                <div className="font-medium text-gray-900 dark:text-gray-100">{obj.name}</div>
                <div className="text-gray-400">Priority {obj.priority}</div>
              </td>
              {applications.map((app) => {
                const severity = getCell(obj.id, app.id);
                const config = severityShort[severity] ?? severityShort.none;
                return (
                  <td
                    key={app.id}
                    className="px-2 py-2 border border-gray-200 dark:border-gray-700 text-center"
                    title={severity === 'none' ? 'No gap identified' : `${severity} gap`}
                  >
                    <div
                      className={`inline-flex items-center justify-center h-6 w-6 rounded font-bold text-xs ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-3 text-xs text-gray-500">
        {Object.entries(severityShort).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`h-4 w-4 rounded ${v.bg} ${v.text} flex items-center justify-center font-bold`}>{v.label}</div>
            <span>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

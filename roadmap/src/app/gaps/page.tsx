import { db } from '@/db';
import { gaps, objectives, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { severityColor } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function GapsPage() {
  let data: any[] = [];

  try {
    data = await db
      .select({
        gap: gaps,
        objective: { id: objectives.id, name: objectives.name, priority: objectives.priority },
        application: { id: applications.id, name: applications.name },
      })
      .from(gaps)
      .leftJoin(objectives, eq(gaps.objectiveId, objectives.id))
      .leftJoin(applications, eq(gaps.applicationId, applications.id))
      .orderBy(objectives.priority);
  } catch {
    // DB not migrated
  }

  const severities = ['critical', 'high', 'medium', 'low'];
  const bySeverity = new Map<string, typeof data>();

  for (const row of data) {
    const sev = row.gap.severity;
    const existing = bySeverity.get(sev) ?? [];
    existing.push(row);
    bySeverity.set(sev, existing);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        AI-identified gaps between business objectives and current platform capabilities.
        Run AI prioritization on the <a href="/plan" className="text-primary-600 hover:underline">Planning page</a> to populate this view.
      </p>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No gaps identified yet.</p>
          <p className="text-sm mt-1">Go to <a href="/plan" className="text-primary-600 hover:underline">2027 Planning</a> and run AI analysis.</p>
        </div>
      )}

      {severities.map((severity) => {
        const rows = bySeverity.get(severity);
        if (!rows || rows.length === 0) return null;
        return (
          <div key={severity}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold ${severityColor(severity)}`}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </span>
              <span className="text-sm text-gray-500">({rows.length})</span>
            </div>
            <div className="space-y-3">
              {rows.map(({ gap, objective, application }) => (
                <Card key={gap.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{gap.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                          {objective?.name && <span>Objective: <strong>{objective.name}</strong></span>}
                          {application?.name && <span>App: <strong>{application.name}</strong></span>}
                        </div>
                        {gap.suggestedInitiatives && (gap.suggestedInitiatives as string[]).length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 font-medium mb-1">Suggested initiatives:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {(gap.suggestedInitiatives as string[]).map((s, i) => (
                                <li key={i} className="text-xs text-gray-700 dark:text-gray-300">{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

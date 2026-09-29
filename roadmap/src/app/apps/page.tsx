import { db } from '@/db';
import { applications, capabilities } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { AppCard } from '@/components/apps/AppCard';
import { Application } from '@/types/entities';

export const dynamic = 'force-dynamic';

export default async function AppsPage() {
  let apps: Application[] = [];
  let capCounts: Record<number, number> = {};

  try {
    apps = await db.select().from(applications).orderBy(applications.layer, applications.name) as Application[];

    const counts = await db
      .select({ applicationId: capabilities.applicationId, count: sql<number>`count(*)::int` })
      .from(capabilities)
      .groupBy(capabilities.applicationId);

    capCounts = Object.fromEntries(counts.map((c) => [c.applicationId, c.count]));
  } catch {
    // DB not migrated yet
  }

  const layers = ['frontend', 'backend', 'api', 'infra', 'platform', 'tooling'];
  const grouped = new Map<string, Application[]>();

  for (const app of apps) {
    const existing = grouped.get(app.layer) ?? [];
    existing.push(app);
    grouped.set(app.layer, existing);
  }

  return (
    <div className="space-y-8">
      {apps.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-medium">No applications seeded yet.</p>
          <p className="text-sm mt-1">
            Run <code className="bg-gray-100 px-1 rounded">npm run seed:roadmap</code> to load the application registry.
          </p>
        </div>
      )}

      {layers.map((layer) => {
        const layerApps = grouped.get(layer);
        if (!layerApps || layerApps.length === 0) return null;
        return (
          <div key={layer}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 capitalize">{layer}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {layerApps.map((app) => (
                <AppCard
                  key={app.id}
                  application={app}
                  capabilityCount={capCounts[app.id] ?? 0}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

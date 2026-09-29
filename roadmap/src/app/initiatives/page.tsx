import { db } from '@/db';
import { initiatives, applications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { categoryColor } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function InitiativesPage() {
  let data: any[] = [];

  try {
    data = await db
      .select({
        initiative: initiatives,
        application: {
          id: applications.id,
          name: applications.name,
          slug: applications.slug,
        },
      })
      .from(initiatives)
      .leftJoin(applications, eq(initiatives.applicationId, applications.id))
      .orderBy(initiatives.year, initiatives.startQuarter, initiatives.name);
  } catch {
    // DB not migrated
  }

  const groupedByYear = new Map<number, typeof data>();
  for (const row of data) {
    const year = row.initiative.year;
    const existing = groupedByYear.get(year) ?? [];
    existing.push(row);
    groupedByYear.set(year, existing);
  }

  const years = Array.from(groupedByYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {data.length} total initiatives across {years.length} years.
      </p>

      {data.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No initiatives yet. Run <code className="bg-gray-100 px-1 rounded">npm run seed:roadmap</code> to load data.</p>
        </div>
      )}

      {years.map((year) => {
        const yearRows = groupedByYear.get(year) ?? [];
        return (
          <Card key={year}>
            <CardHeader>
              <CardTitle>{year} — {yearRows.length} initiatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {yearRows.map(({ initiative, application }) => (
                  <Link key={initiative.id} href={`/initiatives/${initiative.id}`}>
                    <div className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{initiative.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {application?.name && (
                            <span className="text-xs text-gray-500">{application.name}</span>
                          )}
                          {initiative.startQuarter && (
                            <span className="text-xs text-gray-400">{initiative.startQuarter}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`h-2 w-2 rounded-full inline-block ${categoryColor(initiative.category)}`} />
                        <span className="text-xs text-gray-500 hidden sm:inline">{initiative.category}</span>
                        {initiative.effort && (
                          <Badge variant="gray">{initiative.effort}</Badge>
                        )}
                        <StatusBadge status={initiative.status} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

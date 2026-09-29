import { db } from '@/db';
import { initiatives, applications, objectives, gaps, capabilities } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import Link from 'next/link';
import { Map, Grid3X3, Target, AlertTriangle, GitBranch, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  try {
    const [
      initiativeCount,
      appCount,
      objectiveCount,
      gapCount,
      capabilityCount,
      recentInitiatives,
      statusBreakdown,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(initiatives),
      db.select({ count: sql<number>`count(*)::int` }).from(applications),
      db.select({ count: sql<number>`count(*)::int` }).from(objectives),
      db.select({ count: sql<number>`count(*)::int` }).from(gaps),
      db.select({ count: sql<number>`count(*)::int` }).from(capabilities),
      db.select().from(initiatives).orderBy(sql`created_at DESC`).limit(5),
      db
        .select({ status: initiatives.status, count: sql<number>`count(*)::int` })
        .from(initiatives)
        .groupBy(initiatives.status),
    ]);

    return {
      initiativeCount: initiativeCount[0]?.count ?? 0,
      appCount: appCount[0]?.count ?? 0,
      objectiveCount: objectiveCount[0]?.count ?? 0,
      gapCount: gapCount[0]?.count ?? 0,
      capabilityCount: capabilityCount[0]?.count ?? 0,
      recentInitiatives,
      statusBreakdown,
    };
  } catch {
    return {
      initiativeCount: 0,
      appCount: 0,
      objectiveCount: 0,
      gapCount: 0,
      capabilityCount: 0,
      recentInitiatives: [],
      statusBreakdown: [],
    };
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    { label: 'Initiatives', value: stats.initiativeCount, icon: GitBranch, href: '/initiatives', color: 'text-blue-600' },
    { label: 'Applications', value: stats.appCount, icon: Grid3X3, href: '/apps', color: 'text-purple-600' },
    { label: 'Capabilities', value: stats.capabilityCount, icon: Map, href: '/apps', color: 'text-cyan-600' },
    { label: 'Objectives', value: stats.objectiveCount, icon: Target, href: '/plan', color: 'text-green-600' },
    { label: 'Gaps Identified', value: stats.gapCount, icon: AlertTriangle, href: '/gaps', color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Initiative Status</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.statusBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm">No initiatives seeded yet. Run <code className="bg-gray-100 px-1 rounded">npm run seed:roadmap</code> to load historical data.</p>
            ) : (
              <div className="space-y-3">
                {stats.statusBreakdown.map((row) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <StatusBadge status={row.status} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent initiatives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Initiatives</CardTitle>
              <Link href="/initiatives" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats.recentInitiatives.length === 0 ? (
              <p className="text-gray-500 text-sm">No initiatives yet.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.recentInitiatives.map((initiative) => (
                  <div key={initiative.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {initiative.name}
                      </p>
                      <p className="text-xs text-gray-500">{initiative.year} · {initiative.category}</p>
                    </div>
                    <StatusBadge status={initiative.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: '/roadmap', label: 'View Full Timeline', desc: '2022–2027 roadmap' },
              { href: '/plan', label: 'Plan 2027', desc: 'Set objectives, get AI suggestions' },
              { href: '/apps', label: 'Application Registry', desc: 'Capabilities per repo' },
              { href: '/admin/sync', label: 'Sync Jira & GitHub', desc: 'Refresh live data' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:shadow-sm transition-all group"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
                  {item.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

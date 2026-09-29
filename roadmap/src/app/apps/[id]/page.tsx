import { notFound } from 'next/navigation';
import { db } from '@/db';
import { applications, capabilities, initiatives, githubSync } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { CapabilityList } from '@/components/apps/CapabilityList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { layerColor, statusColor, statusLabel } from '@/lib/utils';
import { ExternalLink, GitPullRequest, Tag, CircleAlert } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const [app] = await db.select().from(applications).where(eq(applications.id, id));
  if (!app) notFound();

  const [caps, appInitiatives, ghData] = await Promise.all([
    db.select().from(capabilities).where(eq(capabilities.applicationId, id)),
    db.select().from(initiatives).where(eq(initiatives.applicationId, id)).orderBy(initiatives.year, initiatives.startQuarter),
    db.select().from(githubSync).where(eq(githubSync.repo, app.slug)),
  ]);

  const gh = ghData[0];

  return (
    <div className="space-y-6">
      {/* App header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{app.name}</h1>
            <StatusBadge status={app.status} />
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${layerColor(app.layer)}`}>
              {app.layer}
            </span>
          </div>
          {app.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">{app.description}</p>
          )}
        </div>
        {app.repoUrl && (
          <a
            href={app.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub
          </a>
        )}
      </div>

      {/* Stats row */}
      {gh && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <GitPullRequest className="h-4 w-4" />
                <span className="text-2xl font-bold">{gh.openPrs}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Open PRs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <Tag className="h-4 w-4" />
                <span className="text-sm font-bold">{gh.lastRelease ?? '—'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Latest release</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="flex items-center justify-center gap-2 text-orange-600">
                <CircleAlert className="h-4 w-4" />
                <span className="text-2xl font-bold">{gh.openIssues}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Open Issues</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{caps.length}</p>
              <p className="text-xs text-gray-500 mt-1">Capabilities</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tech stack */}
      {app.techStack && app.techStack.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {app.techStack.map((tech) => (
                <span key={tech} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capabilities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Capabilities ({caps.length})</CardTitle>
            <form action={`/api/ai/analyze`} method="POST">
              <input type="hidden" name="applicationSlug" value={app.slug} />
              <button
                type="submit"
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Run AI analysis →
              </button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <CapabilityList capabilities={caps as any} />
        </CardContent>
      </Card>

      {/* Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap Initiatives ({appInitiatives.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {appInitiatives.length === 0 ? (
            <p className="text-sm text-gray-500">No initiatives linked to this application.</p>
          ) : (
            <div className="space-y-2">
              {appInitiatives.map((ini) => (
                <Link key={ini.id} href={`/initiatives/${ini.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-400 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${statusColor(ini.status)}`} />
                      <span className="text-sm text-gray-900 dark:text-gray-100">{ini.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{ini.year} {ini.startQuarter ?? ''}</span>
                      <StatusBadge status={ini.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

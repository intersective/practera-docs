import { notFound } from 'next/navigation';
import { db } from '@/db';
import { initiatives, applications, objectives, jiraSync } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { ArrowLeft, GitPullRequest, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { EditButton } from '@/components/initiatives/InitiativeDetailClient';

export const dynamic = 'force-dynamic';

export default async function InitiativeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) notFound();

  const [row] = await db
    .select({
      initiative: initiatives,
      application: { id: applications.id, name: applications.name, slug: applications.slug },
      objective: { id: objectives.id, name: objectives.name },
    })
    .from(initiatives)
    .leftJoin(applications, eq(initiatives.applicationId, applications.id))
    .leftJoin(objectives, eq(initiatives.objectiveId, objectives.id))
    .where(eq(initiatives.id, id));

  if (!row) notFound();

  const { initiative, application, objective } = row;

  let jiraData = null;
  if (initiative.jiraEpicKey) {
    const [jira] = await db.select().from(jiraSync).where(eq(jiraSync.epicKey, initiative.jiraEpicKey));
    jiraData = jira;
  }

  const progressPct = jiraData && jiraData.storyCount > 0
    ? Math.round((jiraData.doneCount / jiraData.storyCount) * 100)
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/initiatives" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <ArrowLeft className="h-4 w-4" />
          Back to initiatives
        </Link>
        <EditButton initiative={{
          id: initiative.id,
          name: initiative.name,
          description: initiative.description ?? null,
          status: initiative.status,
          type: initiative.type,
          category: initiative.category,
          year: initiative.year,
          startQuarter: initiative.startQuarter ?? null,
          endQuarter: initiative.endQuarter ?? null,
          effort: initiative.effort ?? null,
          impact: initiative.impact ?? null,
          jiraEpicKey: initiative.jiraEpicKey ?? null,
          manuallyEdited: initiative.manuallyEdited ?? 0,
          customerVisible: initiative.customerVisible ?? 0,
          customerSummary: initiative.customerSummary ?? null,
        }} />
      </div>

      <div>
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{initiative.name}</h1>
          <StatusBadge status={initiative.status} />
          {initiative.manuallyEdited === 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
              Edited
            </span>
          )}
        </div>
        {initiative.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{initiative.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Year', value: initiative.year },
          { label: 'Quarter', value: initiative.startQuarter ?? '—' },
          { label: 'Category', value: initiative.category },
          { label: 'Effort', value: initiative.effort ?? '—' },
          { label: 'Type', value: initiative.type },
          { label: 'Impact', value: initiative.impact ? `${initiative.impact}/5` : '—' },
          { label: 'Application', value: application?.name ?? '—' },
          { label: 'Objective', value: objective?.name ?? '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer page</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500">
            {initiative.customerVisible === 1 ? 'Marked visible' : 'Internal only'}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
            {initiative.customerSummary?.trim() || 'No customer summary yet.'}
          </p>
        </CardContent>
      </Card>

      {jiraData && (
        <Card>
          <CardHeader>
            <CardTitle>Jira Progress: {jiraData.epicKey}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{jiraData.doneCount} / {jiraData.storyCount} stories done</span>
                <span className="font-semibold">{progressPct ?? 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPct ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Status: <strong>{jiraData.status}</strong></span>
                {jiraData.assignee && <span className="text-gray-500">Assignee: {jiraData.assignee}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {initiative.linkedPrs && (() => {
        let prs: string[] = [];
        try { prs = JSON.parse(initiative.linkedPrs); } catch { /* ignore */ }
        if (prs.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="h-4 w-4" />
                Linked GitHub PRs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {prs.map(url => {
                  // Extract repo/number from URL like https://github.com/org/repo/pull/123
                  const parts = url.replace('https://github.com/', '').split('/');
                  const label = parts.length >= 4 ? `${parts[0]}/${parts[1]} #${parts[3]}` : url;
                  return (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

      {initiative.aiPriorityScore && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-600">Priority Score:</span>
              <span className="text-2xl font-bold text-primary-600">{initiative.aiPriorityScore?.toFixed(1)}/10</span>
            </div>
            {initiative.aiRationale && (
              <p className="text-sm text-gray-700 dark:text-gray-300">{initiative.aiRationale}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

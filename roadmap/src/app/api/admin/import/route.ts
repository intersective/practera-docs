import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  applications,
  capabilities,
  objectives,
  initiatives,
  gaps,
  jiraSync,
  githubSync,
} from '@/db/schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  version: z.string(),
  data: z.object({
    applications: z.array(z.record(z.unknown())).optional().default([]),
    capabilities: z.array(z.record(z.unknown())).optional().default([]),
    objectives: z.array(z.record(z.unknown())).optional().default([]),
    initiatives: z.array(z.record(z.unknown())).optional().default([]),
    gaps: z.array(z.record(z.unknown())).optional().default([]),
    jiraSync: z.array(z.record(z.unknown())).optional().default([]),
    githubSync: z.array(z.record(z.unknown())).optional().default([]),
  }),
});

function normTs(row: Record<string, unknown>): Record<string, unknown> {
  const out = { ...row };
  for (const k of ['createdAt', 'updatedAt', 'lastSyncedAt', 'lastReleaseDate']) {
    if (out[k] && typeof out[k] === 'string') out[k] = new Date(out[k] as string);
  }
  return out;
}

function chunks<T>(arr: T[], size = 100): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < arr.length; i += size) r.push(arr.slice(i, i + size));
  return r;
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }
      body = JSON.parse(await (file as File).text());
    } else {
      body = await req.json();
    }

    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }

    const d = parsed.data.data;
    const stats: Record<string, number> = {};

    if (d.applications.length) {
      for (const batch of chunks(d.applications)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(applications).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: applications.id, set: { slug: applications.slug, name: applications.name, description: applications.description, repoUrl: applications.repoUrl, techStack: applications.techStack, layer: applications.layer, status: applications.status, updatedAt: applications.updatedAt } });
      }
      stats.applications = d.applications.length;
    }

    if (d.objectives.length) {
      for (const batch of chunks(d.objectives)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(objectives).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: objectives.id, set: { name: objectives.name, description: objectives.description, priority: objectives.priority, year: objectives.year, metrics: objectives.metrics, updatedAt: objectives.updatedAt } });
      }
      stats.objectives = d.objectives.length;
    }

    if (d.capabilities.length) {
      for (const batch of chunks(d.capabilities)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(capabilities).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: capabilities.id, set: { applicationId: capabilities.applicationId, name: capabilities.name, category: capabilities.category, description: capabilities.description, maturity: capabilities.maturity, gaps: capabilities.gaps, updatedAt: capabilities.updatedAt } });
      }
      stats.capabilities = d.capabilities.length;
    }

    if (d.initiatives.length) {
      for (const batch of chunks(d.initiatives)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(initiatives).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: initiatives.id, set: { name: initiatives.name, description: initiatives.description, type: initiatives.type, status: initiatives.status, category: initiatives.category, year: initiatives.year, startQuarter: initiatives.startQuarter, endQuarter: initiatives.endQuarter, effort: initiatives.effort, impact: initiatives.impact, assignees: initiatives.assignees, applicationId: initiatives.applicationId, objectiveId: initiatives.objectiveId, jiraEpicKey: initiatives.jiraEpicKey, githubMilestone: initiatives.githubMilestone, linkedPrs: initiatives.linkedPrs, manuallyEdited: initiatives.manuallyEdited, aiPriorityScore: initiatives.aiPriorityScore, aiRationale: initiatives.aiRationale, updatedAt: initiatives.updatedAt } });
      }
      stats.initiatives = d.initiatives.length;
    }

    if (d.gaps.length) {
      for (const batch of chunks(d.gaps)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(gaps).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: gaps.id, set: { objectiveId: gaps.objectiveId, applicationId: gaps.applicationId, description: gaps.description, severity: gaps.severity, suggestedInitiatives: gaps.suggestedInitiatives } });
      }
      stats.gaps = d.gaps.length;
    }

    if (d.jiraSync.length) {
      for (const batch of chunks(d.jiraSync)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(jiraSync).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: jiraSync.id, set: { epicKey: jiraSync.epicKey, summary: jiraSync.summary, status: jiraSync.status, assignee: jiraSync.assignee, storyCount: jiraSync.storyCount, doneCount: jiraSync.doneCount, lastSyncedAt: jiraSync.lastSyncedAt } });
      }
      stats.jiraSync = d.jiraSync.length;
    }

    if (d.githubSync.length) {
      for (const batch of chunks(d.githubSync)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(githubSync).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: githubSync.id, set: { repo: githubSync.repo, openPrs: githubSync.openPrs, lastRelease: githubSync.lastRelease, lastReleaseDate: githubSync.lastReleaseDate, openIssues: githubSync.openIssues, lastSyncedAt: githubSync.lastSyncedAt } });
      }
      stats.githubSync = d.githubSync.length;
    }

    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

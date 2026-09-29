#!/usr/bin/env tsx
/**
 * Import roadmap data from a JSON export file.
 * Upserts by ID — safe to run on an already-populated database.
 *
 * Usage:
 *   npm run import -- --file ./exports/practera-roadmap-2026-08-09.json
 *   npm run import -- --file ./exports/practera-roadmap-2026-08-09.json --dry-run
 */

import fs from 'fs';
import { db } from '../src/db';
import {
  applications,
  capabilities,
  objectives,
  initiatives,
  gaps,
  jiraSync,
  githubSync,
} from '../src/db/schema';

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

async function main() {
  const fileArg = process.argv.indexOf('--file');
  if (fileArg === -1 || !process.argv[fileArg + 1]) {
    console.error('Usage: npm run import -- --file <path>');
    process.exit(1);
  }
  const filePath = process.argv[fileArg + 1];
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
    version: string;
    exportedAt: string;
    data: Record<string, Record<string, unknown>[]>;
  };

  console.log(`Importing from: ${filePath}`);
  console.log(`Exported at:    ${raw.exportedAt}`);
  if (dryRun) console.log('(dry-run — no writes)\n');

  const d = raw.data;
  const stats: Record<string, number> = {};

  if (d.applications?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.applications)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(applications).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: applications.id, set: { slug: applications.slug, name: applications.name, description: applications.description, repoUrl: applications.repoUrl, techStack: applications.techStack, layer: applications.layer, status: applications.status, updatedAt: applications.updatedAt } });
      }
    }
    stats.applications = d.applications.length;
  }

  if (d.objectives?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.objectives)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(objectives).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: objectives.id, set: { name: objectives.name, description: objectives.description, priority: objectives.priority, year: objectives.year, metrics: objectives.metrics, updatedAt: objectives.updatedAt } });
      }
    }
    stats.objectives = d.objectives.length;
  }

  if (d.capabilities?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.capabilities)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(capabilities).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: capabilities.id, set: { applicationId: capabilities.applicationId, name: capabilities.name, category: capabilities.category, description: capabilities.description, maturity: capabilities.maturity, gaps: capabilities.gaps, updatedAt: capabilities.updatedAt } });
      }
    }
    stats.capabilities = d.capabilities.length;
  }

  if (d.initiatives?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.initiatives)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(initiatives).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: initiatives.id, set: { name: initiatives.name, description: initiatives.description, type: initiatives.type, status: initiatives.status, category: initiatives.category, year: initiatives.year, startQuarter: initiatives.startQuarter, endQuarter: initiatives.endQuarter, effort: initiatives.effort, impact: initiatives.impact, assignees: initiatives.assignees, applicationId: initiatives.applicationId, objectiveId: initiatives.objectiveId, jiraEpicKey: initiatives.jiraEpicKey, githubMilestone: initiatives.githubMilestone, aiPriorityScore: initiatives.aiPriorityScore, aiRationale: initiatives.aiRationale, updatedAt: initiatives.updatedAt } });
      }
    }
    stats.initiatives = d.initiatives.length;
  }

  if (d.gaps?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.gaps)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(gaps).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: gaps.id, set: { objectiveId: gaps.objectiveId, applicationId: gaps.applicationId, description: gaps.description, severity: gaps.severity, suggestedInitiatives: gaps.suggestedInitiatives } });
      }
    }
    stats.gaps = d.gaps.length;
  }

  if (d.jiraSync?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.jiraSync)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(jiraSync).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: jiraSync.id, set: { epicKey: jiraSync.epicKey, summary: jiraSync.summary, status: jiraSync.status, assignee: jiraSync.assignee, storyCount: jiraSync.storyCount, doneCount: jiraSync.doneCount, lastSyncedAt: jiraSync.lastSyncedAt } });
      }
    }
    stats.jiraSync = d.jiraSync.length;
  }

  if (d.githubSync?.length) {
    if (!dryRun) {
      for (const batch of chunks(d.githubSync)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.insert(githubSync).values(batch.map(normTs) as any)
          .onConflictDoUpdate({ target: githubSync.id, set: { repo: githubSync.repo, openPrs: githubSync.openPrs, lastRelease: githubSync.lastRelease, lastReleaseDate: githubSync.lastReleaseDate, openIssues: githubSync.openIssues, lastSyncedAt: githubSync.lastSyncedAt } });
      }
    }
    stats.githubSync = d.githubSync.length;
  }

  console.log(`${dryRun ? 'Would import' : '✓ Imported'}:`);
  for (const [k, n] of Object.entries(stats)) {
    console.log(`  ${k.padEnd(16)} ${n} rows`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { githubSync, applications } from '@/db/schema';
import { fetchRepoStats } from '@/services/github.service';

const TRACKED_REPOS = [
  'practera-admin',
  'practera-app',
  'practera-login-app',
  'practera-login-api',
  'practera-graphql-api',
  'practera-services',
  'practera-tusd',
  'practera-mcp-server',
  'practera-test-suite',
  'practera-devops-center',
  'project-hub',
  'project-brief-ai-generator',
];

export async function POST(_req: NextRequest) {
  try {
    const results = [];

    for (const repo of TRACKED_REPOS) {
      try {
        const stats = await fetchRepoStats(repo);

        const [upserted] = await db
          .insert(githubSync)
          .values({
            repo: stats.repo,
            openPrs: stats.openPrs,
            lastRelease: stats.lastRelease,
            lastReleaseDate: stats.lastReleaseDate,
            openIssues: stats.openIssues,
            defaultBranch: stats.defaultBranch,
            lastSyncedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: githubSync.repo,
            set: {
              openPrs: stats.openPrs,
              lastRelease: stats.lastRelease,
              lastReleaseDate: stats.lastReleaseDate,
              openIssues: stats.openIssues,
              defaultBranch: stats.defaultBranch,
              lastSyncedAt: new Date(),
            },
          })
          .returning();

        results.push(upserted);
      } catch (repoErr) {
        console.error(`Failed to sync ${repo}:`, repoErr);
      }
    }

    return NextResponse.json({ synced: results.length, repos: results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const data = await db.select().from(githubSync).orderBy(githubSync.lastSyncedAt);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

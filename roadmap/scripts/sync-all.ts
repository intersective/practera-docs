/**
 * Sync all external data: Jira epics + GitHub repo stats.
 * Run with: npm run sync
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../src/db/schema/index';
import { fetchEpics } from '../src/services/jira.service';
import { fetchAllRepoStats } from '../src/services/github.service';

const pool = new Pool({
  user: process.env.DB_USER || 'intersective',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'roadmap',
  password: process.env.DB_PASSWORD || 'lCG8QXnnmdblKBbzkpc97xlu',
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

const db = drizzle(pool, { schema });

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

async function syncGitHub() {
  if (!process.env.GITHUB_TOKEN) {
    console.log('  ⚠ GITHUB_TOKEN not set — skipping GitHub sync');
    return;
  }

  console.log(`\n🐙 Syncing GitHub (${TRACKED_REPOS.length} repos)...`);
  const stats = await fetchAllRepoStats(TRACKED_REPOS);

  for (const s of stats) {
    await db
      .insert(schema.githubSync)
      .values({
        repo: s.repo,
        openPrs: s.openPrs,
        lastRelease: s.lastRelease,
        lastReleaseDate: s.lastReleaseDate,
        openIssues: s.openIssues,
        defaultBranch: s.defaultBranch,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.githubSync.repo,
        set: {
          openPrs: s.openPrs,
          lastRelease: s.lastRelease,
          lastReleaseDate: s.lastReleaseDate,
          openIssues: s.openIssues,
          defaultBranch: s.defaultBranch,
          lastSyncedAt: new Date(),
        },
      });
    process.stdout.write('.');
  }
  console.log(`\n  ✓ ${stats.length} repos synced`);
}

async function syncJira() {
  if (!process.env.ATLASSIAN_TOKEN || !process.env.ATLASSIAN_EMAIL) {
    console.log('  ⚠ ATLASSIAN_TOKEN/EMAIL not set — skipping Jira sync');
    return;
  }

  console.log('\n🎯 Syncing Jira epics...');

  try {
    const epics = await fetchEpics();
    for (const epic of epics) {
      await db
        .insert(schema.jiraSync)
        .values({
          epicKey: epic.key,
          summary: epic.summary,
          status: epic.status,
          assignee: epic.assignee,
          storyCount: epic.storyCount,
          doneCount: epic.doneCount,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.jiraSync.epicKey,
          set: {
            summary: epic.summary,
            status: epic.status,
            assignee: epic.assignee,
            storyCount: epic.storyCount,
            doneCount: epic.doneCount,
            lastSyncedAt: new Date(),
          },
        });
      process.stdout.write('.');
    }
    console.log(`\n  ✓ ${epics.length} Jira epics synced`);
  } catch (e) {
    console.log(`\n  ✗ Jira sync failed: ${e}`);
  }
}

async function main() {
  console.log('🔄 Practera Roadmap — Full Sync\n');

  await syncGitHub();
  await syncJira();

  console.log('\n✅ Sync complete!');
}

main()
  .catch((e) => {
    console.error('\n❌ Sync failed:', e);
    process.exit(1);
  })
  .finally(() => pool.end());

import { serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';

export const jiraSync = roadmapSchema.table('jira_sync', {
  id: serial('id').primaryKey(),
  epicKey: varchar('epic_key', { length: 50 }).notNull().unique(),
  summary: text('summary'),
  status: varchar('status', { length: 100 }),
  assignee: varchar('assignee', { length: 200 }),
  storyCount: integer('story_count').notNull().default(0),
  doneCount: integer('done_count').notNull().default(0),
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
});

export const githubSync = roadmapSchema.table('github_sync', {
  id: serial('id').primaryKey(),
  repo: varchar('repo', { length: 200 }).notNull().unique(),
  openPrs: integer('open_prs').notNull().default(0),
  lastRelease: varchar('last_release', { length: 100 }),
  lastReleaseDate: timestamp('last_release_date'),
  openIssues: integer('open_issues').notNull().default(0),
  defaultBranch: varchar('default_branch', { length: 100 }),
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
});

export type JiraSync = typeof jiraSync.$inferSelect;
export type GitHubSync = typeof githubSync.$inferSelect;

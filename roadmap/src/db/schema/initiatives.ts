import { serial, varchar, text, timestamp, integer, doublePrecision, uniqueIndex } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';
import { applications } from './applications';
import { objectives } from './objectives';

export const initiatives = roadmapSchema.table('initiatives', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull().default('feature'),
  status: varchar('status', { length: 50 }).notNull().default('planned'),
  category: varchar('category', { length: 50 }).notNull().default('PLATFORM'),
  year: integer('year').notNull(),
  startQuarter: varchar('start_quarter', { length: 10 }),
  endQuarter: varchar('end_quarter', { length: 10 }),
  effort: varchar('effort', { length: 10 }),
  impact: integer('impact'),
  assignees: text('assignees'),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'set null' }),
  objectiveId: integer('objective_id').references(() => objectives.id, { onDelete: 'set null' }),
  jiraEpicKey: varchar('jira_epic_key', { length: 50 }),
  githubMilestone: varchar('github_milestone', { length: 200 }),
  linkedPrs: text('linked_prs'),
  aiPriorityScore: doublePrecision('ai_priority_score'),
  aiRationale: text('ai_rationale'),
  // 1 = eligible for the public What's coming page. Still needs a customer summary.
  customerVisible: integer('customer_visible').notNull().default(0),
  customerSummary: text('customer_summary'),
  // Flag to mark rows that have been manually edited — seeds will not touch these
  manuallyEdited: integer('manually_edited').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('initiatives_name_year_unique').on(t.name, t.year),
]);

export type Initiative = typeof initiatives.$inferSelect;
export type NewInitiative = typeof initiatives.$inferInsert;

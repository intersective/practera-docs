import { serial, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';

export const applications = roadmapSchema.table('applications', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  repoUrl: varchar('repo_url', { length: 500 }),
  techStack: jsonb('tech_stack').$type<string[]>(),
  layer: varchar('layer', { length: 50 }).notNull().default('platform'),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;

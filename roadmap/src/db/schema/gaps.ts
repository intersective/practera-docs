import { serial, varchar, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';
import { objectives } from './objectives';
import { applications } from './applications';

export const gaps = roadmapSchema.table('gaps', {
  id: serial('id').primaryKey(),
  objectiveId: integer('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  suggestedInitiatives: jsonb('suggested_initiatives').$type<string[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Gap = typeof gaps.$inferSelect;
export type NewGap = typeof gaps.$inferInsert;

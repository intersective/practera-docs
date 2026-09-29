import { serial, varchar, text, timestamp, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';

export const objectives = roadmapSchema.table('objectives', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  year: integer('year').notNull(),
  priority: integer('priority').notNull().default(3),
  metrics: jsonb('metrics').$type<string[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('objectives_name_year_unique').on(t.name, t.year),
]);

export type Objective = typeof objectives.$inferSelect;
export type NewObjective = typeof objectives.$inferInsert;

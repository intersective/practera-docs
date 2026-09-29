import { serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { roadmapSchema } from './_schema';
import { applications } from './applications';

export const capabilities = roadmapSchema.table('capabilities', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 300 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  maturity: varchar('maturity', { length: 50 }).notNull().default('stable'),
  gaps: text('gaps'),
  integrations: text('integrations'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Capability = typeof capabilities.$inferSelect;
export type NewCapability = typeof capabilities.$inferInsert;

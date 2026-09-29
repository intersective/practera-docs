import { z } from 'zod';

export const CreateInitiativeSchema = z.object({
  name: z.string().min(1).max(500),
  // .nullish() = optional() + nullable() — forms send null for cleared fields
  description: z.string().nullish(),
  type: z.enum(['feature', 'improvement', 'maintenance', 'techDebt']).default('feature'),
  status: z.enum(['planned', 'inDevelopment', 'complete', 'cancelled', 'maintenance']).default('planned'),
  category: z.enum(['PLATFORM', 'ADMIN', 'APP', 'MAINTENANCE', 'INFRA']).default('PLATFORM'),
  year: z.number().int().min(2022).max(2030),
  startQuarter: z.string().nullish(),
  endQuarter: z.string().nullish(),
  effort: z.enum(['S', 'M', 'L', 'XL']).nullish(),
  impact: z.number().int().min(1).max(5).nullish(),
  assignees: z.string().nullish(),
  applicationId: z.number().int().nullish(),
  objectiveId: z.number().int().nullish(),
  jiraEpicKey: z.string().nullish(),
  customerVisible: z.number().int().min(0).max(1).nullish(),
  customerSummary: z.string().nullish(),
});

export const UpdateInitiativeSchema = CreateInitiativeSchema.partial();

export const CreateObjectiveSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  year: z.number().int().min(2025).max(2030),
  priority: z.number().int().min(1).max(5).default(3),
  metrics: z.array(z.string()).optional(),
});

export const CreateApplicationSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  repoUrl: z.string().url().optional(),
  techStack: z.array(z.string()).optional(),
  layer: z.enum(['frontend', 'backend', 'api', 'infra', 'platform', 'tooling']).default('platform'),
  status: z.enum(['active', 'deprecated', 'planned']).default('active'),
});

export const SyncRequestSchema = z.object({
  force: z.boolean().optional().default(false),
});

export const AIAnalyzeSchema = z.object({
  applicationSlug: z.string(),
  force: z.boolean().optional().default(false),
});

export const AIPrioritizeSchema = z.object({
  year: z.number().int().min(2026).max(2030).default(2027),
  objectiveIds: z.array(z.number().int()).optional(),
});

export const AISuggestSchema = z.object({
  year: z.number().int().min(2026).max(2030).default(2027),
  objectiveIds: z.array(z.number().int()).optional(),
  count: z.number().int().min(1).max(20).default(10),
});

export type CreateInitiativeDto = z.infer<typeof CreateInitiativeSchema>;
export type UpdateInitiativeDto = z.infer<typeof UpdateInitiativeSchema>;
export type CreateObjectiveDto = z.infer<typeof CreateObjectiveSchema>;
export type CreateApplicationDto = z.infer<typeof CreateApplicationSchema>;

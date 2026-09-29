import OpenAI from 'openai';
import type { AICapabilityResult, AIPrioritizationResult } from '@/types/entities';

const MODEL = 'gpt-5.6-terra';

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function analyzeApplicationCapabilities(
  applicationSlug: string,
  claudeMdContent: string,
): Promise<AICapabilityResult> {
  const client = getClient();

  const systemPrompt = `You are a software architecture analyst. Analyze the provided CLAUDE.md documentation for a Practera platform application and extract structured capability information. Return ONLY valid JSON.`;

  const userPrompt = `Analyze this application documentation for "${applicationSlug}" and extract all capabilities.

For each capability, identify:
- name: short descriptive name (max 60 chars)
- category: one of: auth, UI, API, data, infra, AI, integration, testing, devops
- description: 1-2 sentence description of what this capability does
- maturity: one of: stable, prototype, legacy, planned, deprecated
- gaps: any known limitations or gaps mentioned (empty string if none)
- integrations: what other Practera services/apps this integrates with (empty string if none)

Return JSON in this exact format:
{
  "applicationSlug": "${applicationSlug}",
  "capabilities": [
    {
      "name": "...",
      "category": "...",
      "description": "...",
      "maturity": "...",
      "gaps": "...",
      "integrations": "..."
    }
  ]
}

CLAUDE.md content:
${claudeMdContent}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content) as AICapabilityResult;
}

export async function analyzeAllApplicationCapabilities(apps: {
  slug: string;
  claudeMdContent: string;
}[]): Promise<AICapabilityResult[]> {
  const client = getClient();

  const appDocs = apps
    .map((a) => `## APPLICATION: ${a.slug}\n\n${a.claudeMdContent}`)
    .join('\n\n---\n\n');

  const systemPrompt = `You are a software architecture analyst. Analyze multiple Practera platform application documentation files and extract structured capability information for each. Return ONLY valid JSON.`;

  const userPrompt = `Analyze ALL of the following Practera application documentation files and extract capabilities for each.

For each application and each capability, identify:
- name: short descriptive name (max 60 chars)  
- category: one of: auth, UI, API, data, infra, AI, integration, testing, devops
- description: 1-2 sentence description
- maturity: one of: stable, prototype, legacy, planned, deprecated
- gaps: known limitations (empty string if none)
- integrations: other Practera apps/services this integrates with (empty string if none)

Return JSON in this exact format:
{
  "results": [
    {
      "applicationSlug": "app-slug",
      "capabilities": [
        { "name": "...", "category": "...", "description": "...", "maturity": "...", "gaps": "...", "integrations": "..." }
      ]
    }
  ]
}

${appDocs}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  const parsed = JSON.parse(content) as { results: AICapabilityResult[] };
  return parsed.results;
}

export async function prioritizeInitiatives(params: {
  objectives: { name: string; description?: string | null; priority: number }[];
  initiatives: { id: number; name: string; description?: string | null; type: string; status: string; year: number }[];
  capabilities: { applicationName: string; name: string; maturity: string; gaps?: string | null }[];
}): Promise<AIPrioritizationResult> {
  const client = getClient();

  const systemPrompt = `You are a strategic product roadmap advisor. Analyze business objectives, current platform capabilities, and existing initiatives to provide prioritization scores and identify gaps. Return ONLY valid JSON.`;

  const userPrompt = `Analyze the following business objectives, current capabilities, and proposed initiatives for Practera's platform.

BUSINESS OBJECTIVES (by priority 1=highest):
${params.objectives.map((o) => `- [P${o.priority}] ${o.name}${o.description ? ': ' + o.description : ''}`).join('\n')}

CURRENT PLATFORM CAPABILITIES (with maturity):
${params.capabilities.map((c) => `- ${c.applicationName} > ${c.name} [${c.maturity}]${c.gaps ? ' (gaps: ' + c.gaps + ')' : ''}`).join('\n')}

INITIATIVES TO PRIORITIZE:
${params.initiatives.map((i) => `- [ID:${i.id}] ${i.name} (${i.type}, ${i.status}, ${i.year})`).join('\n')}

Score each initiative 0-10 against how well it addresses the objectives given current capabilities.
Also identify gaps between objectives and current capabilities.

Return JSON in this exact format:
{
  "initiatives": [
    { "id": 1, "name": "...", "score": 8.5, "rationale": "...", "effort": "M", "impact": 4 }
  ],
  "gaps": [
    { "objectiveName": "...", "applicationName": "...", "description": "...", "severity": "high", "suggestedInitiatives": ["..."] }
  ]
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content) as AIPrioritizationResult;
}

export async function suggestInitiatives(params: {
  year: number;
  objectives: { name: string; description?: string | null; priority: number }[];
  capabilities: { applicationName: string; name: string; maturity: string; gaps?: string | null }[];
  existingInitiatives: { name: string; status: string; year: number }[];
  count: number;
}): Promise<{
  suggestions: {
    name: string;
    description: string;
    type: string;
    category: string;
    effort: string;
    impact: number;
    objectiveName: string;
    rationale: string;
  }[];
}> {
  const client = getClient();

  const systemPrompt = `You are a strategic product advisor for Practera, an experiential learning platform. Suggest concrete, practical engineering initiatives. Return ONLY valid JSON.`;

  const userPrompt = `Suggest ${params.count} high-value engineering initiatives for Practera's ${params.year} roadmap.

BUSINESS OBJECTIVES (by priority):
${params.objectives.map((o) => `- [P${o.priority}] ${o.name}${o.description ? ': ' + o.description : ''}`).join('\n')}

CURRENT CAPABILITIES WITH GAPS:
${params.capabilities
  .filter((c) => c.gaps)
  .map((c) => `- ${c.applicationName}: ${c.name} (${c.maturity}) - gaps: ${c.gaps}`)
  .join('\n')}

EXISTING INITIATIVES (avoid duplicating):
${params.existingInitiatives.map((i) => `- ${i.name} [${i.status}]`).join('\n')}

Suggest practical ${params.year} initiatives that:
1. Address the highest-priority business objectives
2. Fill identified capability gaps
3. Build on existing platform strengths
4. Are implementable given the current tech stack (CakePHP → Next.js migration in progress, GraphQL API, Angular/Ionic learner app, React login SPA)

Return JSON:
{
  "suggestions": [
    {
      "name": "...",
      "description": "...",
      "type": "feature|improvement|maintenance|techDebt",
      "category": "PLATFORM|ADMIN|APP|MAINTENANCE|INFRA",
      "effort": "S|M|L|XL",
      "impact": 4,
      "objectiveName": "...",
      "rationale": "..."
    }
  ]
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI');

  return JSON.parse(content);
}

// ── Initiative → Jira Epic AI matching ───────────────────────────────────────

export interface AIEpicMatchResult {
  initiativeId: number;
  matches: {
    jiraKey: string;
    confidence: number; // 0–1
    reasoning: string;
    relationship: 'exact' | 'partial' | 'related';
  }[];
}

/**
 * Batch-match roadmap initiatives to Jira epics using AI.
 * Each item in `batch` contains one initiative and its pre-filtered candidate epics
 * (top matches by keyword, to keep context manageable).
 */
export async function matchInitiativesToEpics(
  batch: {
    initiative: { id: number; name: string; description: string | null; status: string; year: number };
    candidates: { key: string; project: string; summary: string; status: string; storyCount: number; doneCount: number }[];
  }[],
): Promise<AIEpicMatchResult[]> {
  if (batch.length === 0) return [];

  const client = getClient();

  const initiativesList = batch
    .map(({ initiative: i }) =>
      `[ID:${i.id}] "${i.name}" (${i.year}, ${i.status})${i.description ? ' — ' + i.description.slice(0, 120) : ''}`,
    )
    .join('\n');

  const epicsByInitiative = batch
    .map(({ initiative: i, candidates }) => {
      if (candidates.length === 0) return null;
      const epicLines = candidates
        .map(e => `  - ${e.key} [${e.project}]: "${e.summary}" (${e.status}, ${e.doneCount}/${e.storyCount} stories done)`)
        .join('\n');
      return `Initiative ID:${i.id} — "${i.name}":\n${epicLines}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const systemPrompt = `You are a product analyst for Practera, an experiential learning platform. 
Your job is to match roadmap initiatives to their corresponding Jira epics for progress tracking.
Return ONLY valid JSON. Be conservative: only match when there is a genuine thematic relationship.`;

  const userPrompt = `Match the following roadmap initiatives to their best-fit Jira epics.

IMPORTANT:
- Only return matches where confidence >= 0.5
- "exact": the epic is the primary Jira tracking vehicle for this initiative
- "partial": the epic covers some but not all of the initiative's scope
- "related": the epic is in the same area but not a direct match
- An initiative may match 0, 1, or 2 epics
- reasoning must be 1–2 sentences explaining WHY they match

INITIATIVES:
${initiativesList}

CANDIDATE JIRA EPICS (per initiative):
${epicsByInitiative}

Return JSON:
{
  "matches": [
    {
      "initiativeId": 123,
      "jiraKey": "CORE-4567",
      "confidence": 0.85,
      "reasoning": "The epic 'Login Refactor' directly implements the 'Passwordless Auth' initiative scope.",
      "relationship": "exact"
    }
  ]
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No response from AI for epic matching');

  const raw = JSON.parse(content) as { matches: { initiativeId: number; jiraKey: string; confidence: number; reasoning: string; relationship: 'exact' | 'partial' | 'related' }[] };

  // Group by initiative ID
  const byInitiative = new Map<number, AIEpicMatchResult>();
  for (const item of batch) {
    byInitiative.set(item.initiative.id, { initiativeId: item.initiative.id, matches: [] });
  }
  for (const m of raw.matches ?? []) {
    const existing = byInitiative.get(m.initiativeId);
    if (existing) {
      existing.matches.push({
        jiraKey: m.jiraKey,
        confidence: Math.min(1, Math.max(0, m.confidence)),
        reasoning: m.reasoning ?? '',
        relationship: m.relationship ?? 'related',
      });
    }
  }

  return Array.from(byInitiative.values());
}

import { Octokit } from '@octokit/rest';
import { matchInitiativesToEpics } from '@/services/ai.service';

const GITHUB_ORG = process.env.GITHUB_ORG || 'intersective';
const ATLASSIAN_BASE_URL = process.env.ATLASSIAN_BASE_URL || 'https://practera.atlassian.net';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || '';
const ATLASSIAN_TOKEN = process.env.ATLASSIAN_TOKEN || '';

function jiraAuthHeader() {
  return `Basic ${Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_TOKEN}`).toString('base64')}`;
}

// Repos we track PRs for
const TARGET_REPOS = [
  'practera-app',
  'practera-admin',
  'practera-graphql-api',
  'practera-login-api',
  'practera-login-app',
  'practera-services',
  'practera-project-hub',
  'practera-roadmap',
  'practera-mcp-server',
  'practera-devops-center',
  'practera-tusd',
];

// ── Keyword similarity (pre-filter before AI) ─────────────────────────────────

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'of', 'on', 'at', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'as', 'with', 'from', 'that', 'this',
  'it', 'its', 'not', 'no', 'new', 'add', 'update', 'fix', 'feat', 'chore',
  'docs', 'refactor', 'improve', 'support',
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccardScore(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersect = 0;
  setA.forEach(w => { if (setB.has(w)) intersect++; });
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface JiraMatch {
  key: string;
  summary: string;
  status: string;
  project: string;
  url: string;
  storyCount: number;
  doneCount: number;
  confidence: number;   // 0–1 from AI
  reasoning: string;    // AI explanation
  relationship: 'exact' | 'partial' | 'related';
}

export interface GithubPrMatch {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  mergedAt?: string;
  score: number;        // keyword Jaccard score
}

export interface InconsistencyFlag {
  initiativeId: number;
  initiativeName: string;
  initiativeStatus: string;
  epicKey: string;
  epicSummary: string;
  epicStatus: string;
  storyCount: number;
  doneCount: number;
  type: 'complete_with_open_stories' | 'complete_epic_not_done' | 'in_dev_epic_done' | 'all_stories_done';
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface InitiativeMatch {
  initiativeId: number;
  initiativeName: string;
  currentJiraKey?: string | null;
  jiraMatches: JiraMatch[];
  githubPrMatches: GithubPrMatch[];
}

export interface InvestigationResult {
  matches: InitiativeMatch[];
  inconsistencies: InconsistencyFlag[];
  epicCount: number;
  prCount: number;
}

// ── Jira ─────────────────────────────────────────────────────────────────────

export interface RawEpic {
  key: string;
  project: string;
  summary: string;
  status: string;
  storyCount: number;
  doneCount: number;
}

export async function fetchAllJiraEpics(): Promise<RawEpic[]> {
  if (!ATLASSIAN_TOKEN || !ATLASSIAN_EMAIL) return [];

  const jql = 'issuetype = Epic ORDER BY updated DESC';
  const url = `${ATLASSIAN_BASE_URL}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=500&fields=summary,status,project`;

  const res = await fetch(url, {
    headers: { Authorization: jiraAuthHeader(), 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jira API error ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    issues: {
      key: string;
      fields: { summary: string; status: { name: string }; project: { key: string } };
    }[];
  };

  return data.issues.map(i => ({
    key: i.key,
    project: i.fields.project.key,
    summary: i.fields.summary,
    status: i.fields.status.name,
    storyCount: 0,
    doneCount: 0,
  }));
}

// ── GitHub PRs ────────────────────────────────────────────────────────────────

interface RawPR {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  mergedAt?: string;
  branchName: string;
}

async function fetchRepoPRs(octokit: Octokit, repo: string): Promise<RawPR[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);

  const [openRes, closedRes] = await Promise.allSettled([
    octokit.pulls.list({ owner: GITHUB_ORG, repo, state: 'open', per_page: 50 }),
    octokit.pulls.list({ owner: GITHUB_ORG, repo, state: 'closed', per_page: 50, sort: 'updated', direction: 'desc' }),
  ]);

  const results: RawPR[] = [];

  if (openRes.status === 'fulfilled') {
    for (const pr of openRes.value.data) {
      results.push({ repo, number: pr.number, title: pr.title, state: 'open', url: pr.html_url, branchName: pr.head.ref });
    }
  }

  if (closedRes.status === 'fulfilled') {
    for (const pr of closedRes.value.data) {
      if (!pr.merged_at) continue;
      if (new Date(pr.merged_at) < cutoff) continue;
      results.push({ repo, number: pr.number, title: pr.title, state: 'closed', url: pr.html_url, mergedAt: pr.merged_at, branchName: pr.head.ref });
    }
  }

  return results;
}

export async function fetchAllRepoPRs(): Promise<RawPR[]> {
  if (!process.env.GITHUB_TOKEN) return [];
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const settled = await Promise.allSettled(TARGET_REPOS.map(r => fetchRepoPRs(octokit, r)));
  const all: RawPR[] = [];
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

// ── Inconsistency detection ───────────────────────────────────────────────────

const DONE_STATUSES = new Set(['Done', 'Closed', 'Released', 'Complete', 'Resolved']);

function detectInconsistencies(
  initiatives: { id: number; name: string; status: string; jiraEpicKey?: string | null }[],
  syncedEpics: Map<string, { summary: string; status: string; storyCount: number; doneCount: number }>,
): InconsistencyFlag[] {
  const flags: InconsistencyFlag[] = [];

  for (const init of initiatives) {
    if (!init.jiraEpicKey) continue;
    const epic = syncedEpics.get(init.jiraEpicKey);
    if (!epic) continue;

    const { summary, status: epicStatus, storyCount, doneCount } = epic;
    const openCount = storyCount - doneCount;
    const epicDone = DONE_STATUSES.has(epicStatus);

    // 1. Initiative marked complete but has open stories
    if (init.status === 'complete' && storyCount > 0 && openCount > 0) {
      flags.push({
        initiativeId: init.id,
        initiativeName: init.name,
        initiativeStatus: init.status,
        epicKey: init.jiraEpicKey,
        epicSummary: summary,
        epicStatus,
        storyCount,
        doneCount,
        type: 'complete_with_open_stories',
        severity: 'error',
        message: `Marked complete but ${openCount} of ${storyCount} Jira stories are still open.`,
      });
    }

    // 2. Initiative marked complete but epic itself not in a done state
    if (init.status === 'complete' && !epicDone) {
      flags.push({
        initiativeId: init.id,
        initiativeName: init.name,
        initiativeStatus: init.status,
        epicKey: init.jiraEpicKey,
        epicSummary: summary,
        epicStatus,
        storyCount,
        doneCount,
        type: 'complete_epic_not_done',
        severity: 'warning',
        message: `Marked complete but linked Jira epic status is "${epicStatus}" (not Done/Closed).`,
      });
    }

    // 3. Initiative in development but epic is already closed
    if (init.status === 'inDevelopment' && epicDone) {
      flags.push({
        initiativeId: init.id,
        initiativeName: init.name,
        initiativeStatus: init.status,
        epicKey: init.jiraEpicKey,
        epicSummary: summary,
        epicStatus,
        storyCount,
        doneCount,
        type: 'in_dev_epic_done',
        severity: 'warning',
        message: `Initiative is in development but linked Jira epic "${epicStatus}" — consider marking initiative complete.`,
      });
    }

    // 4. All stories done, initiative not yet complete
    if (!['complete', 'cancelled'].includes(init.status) && storyCount > 0 && doneCount === storyCount && epicDone) {
      flags.push({
        initiativeId: init.id,
        initiativeName: init.name,
        initiativeStatus: init.status,
        epicKey: init.jiraEpicKey,
        epicSummary: summary,
        epicStatus,
        storyCount,
        doneCount,
        type: 'all_stories_done',
        severity: 'info',
        message: `All ${storyCount} stories done and epic is "${epicStatus}" — consider marking initiative complete.`,
      });
    }
  }

  return flags;
}

// ── Main investigation ────────────────────────────────────────────────────────

const CANDIDATE_POOL = 15; // Top-N epics per initiative fed to AI
const AI_BATCH_SIZE = 10;  // Initiatives per AI call
const AI_CONCURRENCY = 4;  // Parallel AI calls

// Statuses we skip for AI matching (already resolved or irrelevant)
const SKIP_AI_STATUSES = new Set(['cancelled']);

export async function runInvestigation(
  initiatives: { id: number; name: string; description?: string | null; status: string; jiraEpicKey?: string | null; year: number }[],
  syncedEpics: Map<string, { summary: string; status: string; storyCount: number; doneCount: number }>,
): Promise<InvestigationResult> {
  // 1. Fetch live Jira epics and recent GitHub PRs in parallel
  const [jiraEpics, allPrs] = await Promise.all([
    fetchAllJiraEpics(),
    fetchAllRepoPRs(),
  ]);

  // Merge synced story counts into live epics
  const epicsWithCounts: RawEpic[] = jiraEpics.map(e => {
    const synced = syncedEpics.get(e.key);
    return synced ? { ...e, storyCount: synced.storyCount, doneCount: synced.doneCount } : e;
  });

  // 2. Detect inconsistencies on currently-linked initiatives (runs on ALL — no AI needed)
  const inconsistencies = detectInconsistencies(initiatives, syncedEpics);

  // 3. Pre-filter epics per initiative — skip already-linked and cancelled
  //    (already-linked initiatives are handled by inconsistency detection above)
  const unlinked = initiatives.filter(
    i => !i.jiraEpicKey && !SKIP_AI_STATUSES.has(i.status),
  );

  const batchInput = unlinked.map(init => {
    const query = `${init.name} ${init.description ?? ''}`;
    const candidates = epicsWithCounts
      .map(e => ({ ...e, score: jaccardScore(query, e.summary) }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, CANDIDATE_POOL);
    return { initiative: { ...init, description: init.description ?? null }, candidates };
  });

  // 4. AI batch matching — concurrent batches (AI_CONCURRENCY at a time)
  const initiativesWithCandidates = batchInput.filter(b => b.candidates.length > 0);
  const aiResults: Map<number, { jiraKey: string; confidence: number; reasoning: string; relationship: 'exact' | 'partial' | 'related' }[]> = new Map();

  // Split into chunks of AI_BATCH_SIZE, then run AI_CONCURRENCY chunks simultaneously
  const allChunks: (typeof batchInput)[] = [];
  for (let i = 0; i < initiativesWithCandidates.length; i += AI_BATCH_SIZE) {
    allChunks.push(initiativesWithCandidates.slice(i, i + AI_BATCH_SIZE));
  }

  for (let i = 0; i < allChunks.length; i += AI_CONCURRENCY) {
    const window = allChunks.slice(i, i + AI_CONCURRENCY);
    const settled = await Promise.allSettled(window.map(chunk => matchInitiativesToEpics(chunk)));
    for (const r of settled) {
      if (r.status === 'fulfilled') {
        for (const match of r.value) {
          aiResults.set(match.initiativeId, match.matches);
        }
      }
      // Silently skip failed batches — don't abort the whole investigation
    }
  }

  // 5. Build final match list (AI for Jira, keyword for GitHub PRs)
  //    Only for unlinked initiatives — linked ones show in the inconsistency panel instead
  const epicLookup = new Map(epicsWithCounts.map(e => [e.key, e]));

  const matches: InitiativeMatch[] = [];

  for (const init of unlinked) {
    const aiMatches = aiResults.get(init.id) ?? [];
    const jiraMatches: JiraMatch[] = aiMatches
      .filter(m => m.confidence >= 0.5)
      .map(m => {
        const epic = epicLookup.get(m.jiraKey);
        return {
          key: m.jiraKey,
          summary: epic?.summary ?? m.jiraKey,
          status: epic?.status ?? 'Unknown',
          project: epic?.project ?? '',
          url: `${ATLASSIAN_BASE_URL}/browse/${m.jiraKey}`,
          storyCount: epic?.storyCount ?? 0,
          doneCount: epic?.doneCount ?? 0,
          confidence: m.confidence,
          reasoning: m.reasoning,
          relationship: m.relationship,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    const query = `${init.name} ${init.description ?? ''}`;
    const githubPrMatches: GithubPrMatch[] = allPrs
      .map(pr => ({
        repo: pr.repo,
        number: pr.number,
        title: pr.title,
        state: pr.state,
        url: pr.url,
        mergedAt: pr.mergedAt,
        score: Math.max(
          jaccardScore(query, pr.title),
          jaccardScore(query, pr.branchName.replace(/[-_/]/g, ' ')),
        ),
      }))
      .filter(m => m.score >= 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    if (jiraMatches.length > 0 || githubPrMatches.length > 0) {
      matches.push({
        initiativeId: init.id,
        initiativeName: init.name,
        currentJiraKey: init.jiraEpicKey,
        jiraMatches,
        githubPrMatches,
      });
    }
  }

  return {
    matches,
    inconsistencies,
    epicCount: epicsWithCounts.length,
    prCount: allPrs.length,
  };
}

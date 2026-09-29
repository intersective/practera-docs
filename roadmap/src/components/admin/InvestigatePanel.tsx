'use client';

import { useState, useCallback } from 'react';
import {
  Search, Loader2, CheckCircle2, XCircle, Link2,
  ChevronDown, ChevronRight, ExternalLink, AlertTriangle,
  Info, Sparkles, GitPullRequest,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types (mirror investigate.service.ts) ────────────────────────────────────

interface JiraMatch {
  key: string;
  summary: string;
  status: string;
  project: string;
  url: string;
  storyCount: number;
  doneCount: number;
  confidence: number;
  reasoning: string;
  relationship: 'exact' | 'partial' | 'related';
}

interface GithubPrMatch {
  repo: string;
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  mergedAt?: string;
  score: number;
}

interface InconsistencyFlag {
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

interface InitiativeMatch {
  initiativeId: number;
  initiativeName: string;
  currentJiraKey?: string | null;
  jiraMatches: JiraMatch[];
  githubPrMatches: GithubPrMatch[];
}

interface InvestigationResult {
  matches: InitiativeMatch[];
  inconsistencies: InconsistencyFlag[];
  epicCount: number;
  prCount: number;
  error?: string;
}

// ── Inconsistency alert ───────────────────────────────────────────────────────

function InconsistencyCard({ flag }: { flag: InconsistencyFlag }) {
  const epicUrl = `${process.env.NEXT_PUBLIC_ATLASSIAN_BASE_URL ?? 'https://intersective.atlassian.net'}/browse/${flag.epicKey}`;

  const colors = {
    error:   'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    warning: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20',
    info:    'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  };

  const textColors = {
    error:   'text-red-700 dark:text-red-300',
    warning: 'text-amber-700 dark:text-amber-300',
    info:    'text-blue-700 dark:text-blue-300',
  };

  const Icon = flag.severity === 'error' ? XCircle : flag.severity === 'warning' ? AlertTriangle : Info;

  return (
    <div className={cn('rounded-lg border px-3 py-2.5', colors[flag.severity])}>
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', textColors[flag.severity])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <a href={`/initiatives/${flag.initiativeId}`}
              className={cn('text-sm font-semibold hover:underline', textColors[flag.severity])}>
              {flag.initiativeName}
            </a>
            <span className="text-[10px] bg-white/60 dark:bg-black/20 px-1.5 rounded font-mono">
              {flag.epicKey}
            </span>
          </div>
          <p className={cn('text-xs mt-0.5', textColors[flag.severity])}>{flag.message}</p>
          {flag.storyCount > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-white/40 dark:bg-black/20 rounded-full overflow-hidden max-w-[120px]">
                <div
                  className="h-full bg-current opacity-60 rounded-full"
                  style={{ width: `${Math.round((flag.doneCount / flag.storyCount) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono opacity-70">
                {flag.doneCount}/{flag.storyCount} stories done
              </span>
              <a href={epicUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] opacity-70 hover:opacity-100 underline flex items-center gap-0.5">
                Open epic <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Jira match row (AI-powered) ───────────────────────────────────────────────

type AcceptState = 'idle' | 'pending' | 'done' | 'error';

function ConfidencePip({ confidence, relationship }: { confidence: number; relationship: string }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
    : pct >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-500';
  return (
    <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded', color)}>
      {pct}% · {relationship}
    </span>
  );
}

function JiraMatchRow({
  match,
  accepted,
  onAccept,
}: {
  match: JiraMatch;
  accepted: boolean;
  onAccept: () => Promise<void>;
}) {
  const [state, setState] = useState<AcceptState>('idle');
  const openStories = match.storyCount - match.doneCount;

  const handle = async () => {
    setState('pending');
    try { await onAccept(); setState('done'); }
    catch { setState('error'); }
  };

  return (
    <div className="pl-4 border-l-2 border-indigo-100 dark:border-indigo-900 py-1.5 space-y-1">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a href={match.url} target="_blank" rel="noopener noreferrer"
              className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline">
              {match.key}
            </a>
            <ExternalLink className="h-2.5 w-2.5 text-gray-400 shrink-0" />
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-xs">{match.summary}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <ConfidencePip confidence={match.confidence} relationship={match.relationship} />
            <span className="text-[10px] text-gray-400">{match.project} · {match.status}</span>
            {match.storyCount > 0 && (
              <span className={cn('text-[10px]', openStories > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400')}>
                {match.doneCount}/{match.storyCount} stories done{openStories > 0 ? ` · ${openStories} open` : ''}
              </span>
            )}
          </div>
          {match.reasoning && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 italic flex items-start gap-1">
              <Sparkles className="h-2.5 w-2.5 shrink-0 mt-0.5 text-indigo-400" />
              {match.reasoning}
            </p>
          )}
        </div>

        {accepted || state === 'done' ? (
          <span className="shrink-0 text-xs text-green-600 dark:text-green-400 flex items-center gap-1 whitespace-nowrap">
            <CheckCircle2 className="h-3 w-3" /> Linked
          </span>
        ) : (
          <button type="button" onClick={() => { void handle(); }} disabled={state === 'pending'}
            className={cn(
              'shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded border whitespace-nowrap transition-colors',
              state === 'error'
                ? 'border-red-300 text-red-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}>
            {state === 'pending' ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : state === 'error' ? <><XCircle className="h-2.5 w-2.5" /> Error</>
                : <><Link2 className="h-2.5 w-2.5" /> Accept</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── GitHub PR match row (keyword) ─────────────────────────────────────────────

function PrMatchRow({ match, accepted, onAccept }: {
  match: GithubPrMatch;
  accepted: boolean;
  onAccept: () => Promise<void>;
}) {
  const [state, setState] = useState<AcceptState>('idle');
  const handle = async () => {
    setState('pending');
    try { await onAccept(); setState('done'); }
    catch { setState('error'); }
  };

  return (
    <div className="pl-4 border-l-2 border-gray-100 dark:border-gray-800 py-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a href={match.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs">
              {match.repo}#{match.number}: {match.title}
            </a>
            <ExternalLink className="h-2.5 w-2.5 text-gray-400 shrink-0" />
            <span className={cn('text-[10px] px-1 rounded',
              match.state === 'open'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300')}>
              {match.state === 'open' ? 'open' : 'merged'}
            </span>
            <span className="text-[10px] font-mono text-gray-400">{Math.round(match.score * 100)}% keyword</span>
          </div>
        </div>
        {accepted || state === 'done' ? (
          <span className="shrink-0 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Linked
          </span>
        ) : (
          <button type="button" onClick={() => { void handle(); }} disabled={state === 'pending'}
            className="shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            {state === 'pending' ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : <><Link2 className="h-2.5 w-2.5" /> Accept</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Initiative card ───────────────────────────────────────────────────────────

function InitiativeCard({ match }: { match: InitiativeMatch }) {
  const [open, setOpen] = useState(true);
  const [acceptedJira, setAcceptedJira] = useState<string>(match.currentJiraKey ?? '');
  const [acceptedPrs, setAcceptedPrs] = useState<string[]>([]);

  const acceptJira = useCallback(async (key: string) => {
    const res = await fetch('/api/investigate/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'jira', initiativeId: match.initiativeId, epicKey: key }),
    });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? `HTTP ${res.status}`); }
    setAcceptedJira(key);
  }, [match.initiativeId]);

  const acceptGithub = useCallback(async (prUrl: string, prTitle: string) => {
    const res = await fetch('/api/investigate/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'github', initiativeId: match.initiativeId, prUrl, prTitle }),
    });
    if (!res.ok) { const j = await res.json() as { error?: string }; throw new Error(j.error ?? `HTTP ${res.status}`); }
    setAcceptedPrs(prev => [...prev, prUrl]);
  }, [match.initiativeId]);

  const total = match.jiraMatches.length + match.githubPrMatches.length;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left">
        {open ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 truncate">{match.initiativeName}</span>
        {acceptedJira && (
          <span className="text-[10px] font-mono bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-1.5 rounded">
            {acceptedJira}
          </span>
        )}
        <span className="text-xs text-gray-400 shrink-0">{total} match{total !== 1 ? 'es' : ''}</span>
      </button>

      {open && (
        <div className="px-3 py-2 space-y-1.5">
          {match.jiraMatches.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-indigo-400 flex items-center gap-1 mb-1">
                <Sparkles className="h-2.5 w-2.5" /> AI-matched Jira Epics
              </p>
              {match.jiraMatches.map(m => (
                <JiraMatchRow key={m.key} match={m} accepted={acceptedJira === m.key}
                  onAccept={() => acceptJira(m.key)} />
              ))}
            </div>
          )}

          {match.githubPrMatches.length > 0 && (
            <div className={match.jiraMatches.length > 0 ? 'mt-2' : ''}>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1 mb-1">
                <GitPullRequest className="h-2.5 w-2.5" /> GitHub PRs (keyword match)
              </p>
              {match.githubPrMatches.map(m => (
                <PrMatchRow key={m.url} match={m} accepted={acceptedPrs.includes(m.url)}
                  onAccept={() => acceptGithub(m.url, m.title)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'running' | 'done' | 'error';

export function InvestigatePanel() {
  const [state, setState] = useState<PanelState>('idle');
  const [result, setResult] = useState<InvestigationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setState('running');
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/investigate', { method: 'POST' });
      const json = await res.json() as InvestigationResult;
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        setState('error');
      } else {
        setResult(json);
        setState('done');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  };

  const errors   = result?.inconsistencies.filter(f => f.severity === 'error')   ?? [];
  const warnings = result?.inconsistencies.filter(f => f.severity === 'warning') ?? [];
  const infos    = result?.inconsistencies.filter(f => f.severity === 'info')    ?? [];

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="mt-0.5 shrink-0 text-indigo-500">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Investigation</div>
            <p className="text-xs text-gray-500 mt-0.5">
              Uses AI to match initiatives to Jira epics and flags completion inconsistencies.
              Fetches all epics + recent GitHub PRs.
            </p>
          </div>
        </div>

        <button type="button" onClick={() => { void run(); }} disabled={state === 'running'}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0',
            state === 'running'
              ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 text-indigo-600'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200',
          )}>
          {state === 'running'
            ? <><Loader2 className="h-3 w-3 animate-spin" /> Investigating…</>
            : <><Sparkles className="h-3 w-3" /> Investigate</>}
        </button>
      </div>

      {/* Error */}
      {state === 'error' && error && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
          <XCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-4">
          {/* Stats */}
          <p className="text-xs text-gray-400">
            Analysed <strong>{result.epicCount}</strong> Jira epics and <strong>{result.prCount}</strong> GitHub PRs.
            Found <strong>{result.matches.length}</strong> initiative match{result.matches.length !== 1 ? 'es' : ''} and <strong>{result.inconsistencies.length}</strong> inconsisten{result.inconsistencies.length !== 1 ? 'cies' : 'cy'}.
          </p>

          {/* ── Inconsistency alerts ───────────────────────────── */}
          {errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" /> {errors.length} critical inconsistenc{errors.length !== 1 ? 'ies' : 'y'}
              </p>
              {errors.map(f => <InconsistencyCard key={`${f.initiativeId}-${f.type}`} flag={f} />)}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
              </p>
              {warnings.map(f => <InconsistencyCard key={`${f.initiativeId}-${f.type}`} flag={f} />)}
            </div>
          )}
          {infos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" /> {infos.length} suggestion{infos.length !== 1 ? 's' : ''}
              </p>
              {infos.map(f => <InconsistencyCard key={`${f.initiativeId}-${f.type}`} flag={f} />)}
            </div>
          )}

          {/* ── AI-matched items ───────────────────────────────── */}
          {result.matches.length === 0 ? (
            !result.inconsistencies.length && (
              <div className="py-6 text-center text-sm text-gray-400">
                No matches found. Sync Jira epics first to populate story counts.
              </div>
            )
          ) : (
            <div>
              {(errors.length > 0 || warnings.length > 0 || infos.length > 0) && (
                <p className="text-xs font-semibold text-gray-500 mb-2">Suggested links</p>
              )}
              <div className="space-y-2">
                {result.matches.map(m => <InitiativeCard key={m.initiativeId} match={m} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

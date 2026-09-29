'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, RefreshCw, Wifi, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ServiceStatus {
  ok: boolean;
  label: string;
  detail?: string;
}

type CheckState = 'idle' | 'checking' | 'done';
type SyncState  = 'idle' | 'running' | 'done' | 'error';

interface SyncResult { state: SyncState; message: string }

interface AllStatuses {
  github: ServiceStatus;
  jira:   ServiceStatus;
  openai: ServiceStatus;
}

// ── Combined status fetch — one request, three results ───────────────────────
// The server-side endpoint runs all three checks in parallel via Promise.allSettled,
// so the total latency is the slowest single check (~4s), not 3x that.

function useAllStatuses() {
  const [state, setState] = useState<CheckState>('idle');
  const [statuses, setStatuses] = useState<AllStatuses | null>(null);

  const check = useCallback(async () => {
    setState('checking');
    // Keep old statuses visible while re-checking — cleared only on fresh mount
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 20_000);
    try {
      const res = await fetch('/api/admin/status', {
        signal: abort.signal,
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Status API returned HTTP ${res.status}`);
      }
      const data = await res.json() as AllStatuses;
      setStatuses(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isAbort = msg.toLowerCase().includes('abort') || msg.toLowerCase().includes('cancel');
      const err: ServiceStatus = {
        ok: false,
        label: '?',
        detail: isAbort ? 'Timed out — check network' : msg,
      };
      console.error('[IntegrationStatusPanel] status check failed:', msg);
      setStatuses({ github: err, jira: err, openai: err });
    } finally {
      clearTimeout(timer);
      setState('done');
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void check(); }, []);

  return { state, statuses, check };
}

// ── Sync action ──────────────────────────────────────────────────────────────

function useSyncAction(url: string, body?: Record<string, unknown>) {
  const [result, setResult] = useState<SyncResult>({ state: 'idle', message: '' });

  const run = useCallback(async () => {
    setResult({ state: 'running', message: 'Syncing…' });
    try {
      const res = await fetch(url, {
        method: 'POST',
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setResult({ state: 'error', message: (json.error as string) ?? `HTTP ${res.status}` });
      } else {
        // Only display scalar values — skip object/array fields (repos, epics lists, etc.)
        const detail = Object.entries(json)
          .filter(([k, v]) => k !== 'ok' && v !== null && typeof v !== 'object')
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        setResult({ state: 'done', message: detail || 'Done' });
      }
    } catch (e) {
      setResult({ state: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  }, [url, body]);

  return { result, run };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ state, status }: { state: CheckState; status: ServiceStatus | null }) {
  const isChecking = state === 'checking';

  if (isChecking && !status) {
    // First-ever load — no previous status to show
    return (
      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking…
      </span>
    );
  }

  if (state === 'idle' && !status) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (!status) return null;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full',
      status.ok
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    )}>
      {isChecking
        ? <Loader2 className="h-3 w-3 animate-spin" />
        : status.ok
          ? <CheckCircle2 className="h-3 w-3" />
          : <XCircle className="h-3 w-3" />
      }
      {isChecking ? 'Checking…' : (status.detail ?? (status.ok ? 'Connected' : 'Error'))}
    </span>
  );
}

function SyncResultBadge({ result }: { result: SyncResult }) {
  if (result.state === 'idle') return null;
  return (
    <div className={cn(
      'mt-1.5 px-2 py-1 rounded text-xs font-mono flex items-center gap-1.5',
      result.state === 'running' && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300',
      result.state === 'done'    && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
      result.state === 'error'   && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
    )}>
      {result.state === 'running' && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
      {result.state === 'done'    && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {result.state === 'error'   && <XCircle className="h-3 w-3 shrink-0" />}
      {result.message}
    </div>
  );
}

// ── Integration rows ─────────────────────────────────────────────────────────

interface IntegrationRowProps {
  icon: React.ReactNode;
  name: string;
  description: string;
  checkState: CheckState;
  status: ServiceStatus | null;
  onRecheck: () => void;
  syncUrl: string;
  syncBody?: Record<string, unknown>;
}

function IntegrationRow({
  icon, name, description, checkState, status, onRecheck, syncUrl, syncBody,
}: IntegrationRowProps) {
  const { result, run } = useSyncAction(syncUrl, syncBody);
  const syncing = result.state === 'running';
  const canSync = checkState === 'done' && status?.ok === true;

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-gray-400">{icon}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</span>
            <StatusBadge state={checkState} status={status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          <SyncResultBadge result={result} />
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {/* Wifi icon = re-check connectivity — distinct from RefreshCw sync */}
          <button
            type="button"
            onClick={onRecheck}
            disabled={checkState === 'checking'}
            title="Re-check connection"
            className={cn(
              'p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
              checkState === 'checking' && 'opacity-40 pointer-events-none',
            )}
          >
            <Wifi className={cn('h-3.5 w-3.5', checkState === 'checking' && 'animate-pulse')} />
          </button>

          <button
            type="button"
            onClick={() => { void run(); }}
            disabled={syncing || !canSync}
            title={!canSync ? (checkState === 'checking' ? 'Waiting for connection check…' : 'Fix credentials first') : `Sync ${name}`}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              syncing
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 text-blue-600'
                : canSync
                ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed',
              (syncing || !canSync) && 'pointer-events-none',
            )}
          >
            {syncing
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Syncing…</>
              : <><RefreshCw className="h-3 w-3" /> Sync</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

interface AIRowProps {
  checkState: CheckState;
  status: ServiceStatus | null;
  onRecheck: () => void;
}

function AIRow({ checkState, status, onRecheck }: AIRowProps) {
  const [result, setResult] = useState<SyncResult>({ state: 'idle', message: '' });
  const syncing = result.state === 'running';
  const canAnalyze = checkState === 'done' && status?.ok === true;

  const run = async () => {
    setResult({ state: 'running', message: 'Analyzing…' });
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setResult({ state: 'error', message: (json.error as string) ?? `HTTP ${res.status}` });
      } else {
        const analyzed = (json.analyzed as number) ?? 0;
        setResult({ state: 'done', message: `${analyzed} apps analyzed` });
      }
    } catch (e) {
      setResult({ state: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-yellow-500"><Zap className="h-4 w-4" /></div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">AI Analysis</span>
            <StatusBadge state={checkState} status={status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Re-analyze all CLAUDE.md files with GPT to refresh capability data.
          </p>
          <SyncResultBadge result={result} />
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRecheck}
            disabled={checkState === 'checking'}
            title="Re-check OpenAI key"
            className={cn(
              'p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
              checkState === 'checking' && 'opacity-40 pointer-events-none',
            )}
          >
            <Wifi className={cn('h-3.5 w-3.5', checkState === 'checking' && 'animate-pulse')} />
          </button>

          <button
            type="button"
            onClick={() => { void run(); }}
            disabled={syncing || !canAnalyze}
            title={!canAnalyze ? (checkState === 'checking' ? 'Checking OpenAI key…' : 'Invalid or missing OpenAI key') : 'Run AI analysis'}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              syncing
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 text-yellow-600'
                : canAnalyze
                ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 cursor-not-allowed',
              (syncing || !canAnalyze) && 'pointer-events-none',
            )}
          >
            {syncing
              ? <><Loader2 className="h-3 w-3 animate-spin" /> Running…</>
              : <><Zap className="h-3 w-3" /> Analyze</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GitHub SVG icon ──────────────────────────────────────────────────────────

const GitHubIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const JiraIcon = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current text-blue-500">
    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM17.294 0H6.005a5.215 5.215 0 0 0 5.214 5.215h2.129v2.058A5.218 5.218 0 0 0 18.563 12.5V1.005A1.005 1.005 0 0 0 17.294 0z" />
  </svg>
);

// ── Main panel ───────────────────────────────────────────────────────────────

export function IntegrationStatusPanel() {
  const { state, statuses, check } = useAllStatuses();

  return (
    <div>
      <IntegrationRow
        icon={GitHubIcon}
        name="GitHub"
        description="Sync PR counts, latest releases, and open issues for all tracked repos."
        checkState={state}
        status={statuses?.github ?? null}
        onRecheck={() => { void check(); }}
        syncUrl="/api/sync/github"
      />
      <IntegrationRow
        icon={JiraIcon}
        name="Jira"
        description="Sync epics and story progress from Jira Cloud."
        checkState={state}
        status={statuses?.jira ?? null}
        onRecheck={() => { void check(); }}
        syncUrl="/api/sync/jira"
      />
      <AIRow
        checkState={state}
        status={statuses?.openai ?? null}
        onRecheck={() => { void check(); }}
      />

      <p className="mt-3 text-xs text-gray-400">
        Credentials loaded from{' '}
        <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.env</code>.
        After editing <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">.env</code>,
        restart the container then use the{' '}
        <Wifi className="inline h-3 w-3" /> button to re-check.
      </p>
    </div>
  );
}

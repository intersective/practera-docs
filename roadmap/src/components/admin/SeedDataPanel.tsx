'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionState = 'idle' | 'running' | 'done' | 'error';

interface SeedResult {
  state: ActionState;
  message: string;
}

function useSeedAction(url: string) {
  const [result, setResult] = useState<SeedResult>({ state: 'idle', message: '' });

  const run = async () => {
    setResult({ state: 'running', message: 'Loading…' });
    try {
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setResult({ state: 'error', message: (json.error as string) ?? `HTTP ${res.status}` });
      } else {
        const stats = (json.stats ?? json) as Record<string, unknown>;
        const detail = Object.entries(stats)
          .filter(([k]) => k !== 'ok')
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ');
        setResult({ state: 'done', message: detail || 'Done' });
      }
    } catch (e) {
      setResult({ state: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return { result, run };
}

interface SeedButtonProps {
  label: string;
  description: string;
  url: string;
  disabled?: boolean;
  disabledReason?: string;
  badge?: string;
}

function SeedButton({ label, description, url, disabled, disabledReason, badge }: SeedButtonProps) {
  const { result, run } = useSeedAction(url);
  const running = result.state === 'running';
  const done = result.state === 'done';
  const error = result.state === 'error';

  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</span>
            {badge && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 font-mono">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          {disabled && disabledReason && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{disabledReason}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => { void run(); }}
          disabled={disabled || running}
          className={cn(
            'shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
            running
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : done
              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
              : error
              ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200',
            (disabled) && 'opacity-40 cursor-not-allowed pointer-events-none',
          )}
        >
          {running && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
          {running ? 'Loading…' : done ? 'Done ✓' : error ? 'Retry' : 'Load'}
        </button>
      </div>

      {result.state !== 'idle' && (
        <div
          className={cn(
            'mt-2 px-3 py-2 rounded-lg text-xs flex items-start gap-2',
            done && 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
            error && 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
            running && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300',
          )}
        >
          {running && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 mt-0.5" />}
          {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          {error && <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
          <span className="font-mono">{result.message}</span>
        </div>
      )}
    </div>
  );
}

interface CapabilitiesStatus {
  exists: boolean;
  apps?: number;
  capabilities?: number;
}

interface SeedDataPanelProps {
  capabilitiesFileStatus: CapabilitiesStatus;
}

export function SeedDataPanel({ capabilitiesFileStatus }: SeedDataPanelProps) {
  const capCount = capabilitiesFileStatus.capabilities ?? 0;
  const appCount = capabilitiesFileStatus.apps ?? 0;

  return (
    <div>
      <SeedButton
        label="Applications"
        description="Load 12 Practera repo definitions from applications.json"
        url="/api/admin/seed/applications"
        badge="applications.json"
      />
      <SeedButton
        label="Roadmap + Objectives"
        description="Load 2022–2025 historical initiatives, 2026 initiatives, and 2027 objectives"
        url="/api/admin/seed/initiatives"
        badge="roadmap-2022-2025.json · initiatives-2026.json · objectives-2027.json"
      />
      <SeedButton
        label="Capabilities"
        description={
          capabilitiesFileStatus.exists
            ? `${capCount} capabilities across ${appCount} apps in database — click to re-run AI analysis`
            : 'No capabilities yet. Click to analyze CLAUDE.md files with AI (requires OpenAI key).'
        }
        url="/api/admin/seed/capabilities"
        badge={capabilitiesFileStatus.exists ? `${capCount} capabilities` : 'AI analysis'}
      />

      <p className="mt-3 text-xs text-gray-400">
        All seed actions are safe to re-run — they upsert existing rows rather than duplicating.
      </p>
    </div>
  );
}

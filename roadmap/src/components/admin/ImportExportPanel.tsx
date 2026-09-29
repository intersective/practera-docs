'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export function ImportExportPanel() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    ok: boolean;
    stats?: Record<string, number>;
    error?: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Trigger browser download via the API route
    window.location.href = '/api/admin/export';
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/admin/import', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) {
        setImportResult({ ok: false, error: json.error ?? `HTTP ${res.status}` });
      } else {
        setImportResult({ ok: true, stats: json.stats });
      }
    } catch (err) {
      setImportResult({ ok: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setImporting(false);
      // Reset file input so the same file can be re-imported
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Export */}
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border bg-primary-600 hover:bg-primary-700 text-white border-primary-600"
        >
          <Download className="h-4 w-4" />
          Export all data
        </button>

        {/* Import */}
        <label
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border cursor-pointer',
            'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
            'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700',
            importing && 'opacity-50 cursor-not-allowed pointer-events-none',
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleImport}
            disabled={importing}
          />
          {importing ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {importing ? 'Importing…' : 'Import from JSON'}
        </label>
      </div>

      {importResult && (
        <div
          className={`rounded-lg p-4 text-sm flex items-start gap-3 ${
            importResult.ok
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}
        >
          {importResult.ok ? (
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div>
            {importResult.ok ? (
              <>
                <p className="font-medium">Import successful</p>
                {importResult.stats && (
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(importResult.stats).map(([k, n]) => (
                      <li key={k}>
                        {k}: <strong>{n}</strong> rows upserted
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <>
                <p className="font-medium">Import failed</p>
                <p className="mt-1 font-mono text-xs break-all">{importResult.error}</p>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Export creates a <code>.json</code> snapshot of every table (applications, capabilities,
        objectives, initiatives, gaps, Jira &amp; GitHub sync). Import upserts by ID — safe to run
        on an already-populated database.
      </p>
    </div>
  );
}

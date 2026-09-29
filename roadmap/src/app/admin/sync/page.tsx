'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, GitFork, Zap } from 'lucide-react';

interface SyncResult {
  synced: number;
  repos?: unknown[];
  epics?: unknown[];
  error?: string;
}

export default function SyncPage() {
  const [githubResult, setGithubResult] = useState<SyncResult | null>(null);
  const [jiraResult, setJiraResult] = useState<SyncResult | null>(null);
  const [aiResult, setAiResult] = useState<{ analyzed: number; stored: { app: string; count: number }[] } | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const syncGitHub = async () => {
    setGithubLoading(true);
    try {
      const res = await fetch('/api/sync/github', { method: 'POST' });
      setGithubResult(await res.json());
    } catch (e) {
      setGithubResult({ synced: 0, error: String(e) });
    } finally {
      setGithubLoading(false);
    }
  };

  const syncJira = async () => {
    setJiraLoading(true);
    try {
      const res = await fetch('/api/sync/jira', { method: 'POST' });
      setJiraResult(await res.json());
    } catch (e) {
      setJiraResult({ synced: 0, error: String(e) });
    } finally {
      setJiraLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      setAiResult(await res.json());
    } catch (e) {
      setAiResult(null);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* GitHub sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitFork className="h-5 w-5 text-gray-700" />
              <CardTitle>GitHub</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Sync PR counts, latest releases, and open issues for all tracked repos.
            </p>
            <Button variant="primary" size="sm" onClick={syncGitHub} loading={githubLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Now
            </Button>
            {githubResult && (
              <div className="mt-3">
                {githubResult.error ? (
                  <p className="text-xs text-red-600">{githubResult.error}</p>
                ) : (
                  <Badge variant="green">{githubResult.synced} repos synced</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jira sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <CardTitle>Jira</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Sync epics and story progress from Jira Cloud.
            </p>
            <Button variant="primary" size="sm" onClick={syncJira} loading={jiraLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
              Sync Now
            </Button>
            {jiraResult && (
              <div className="mt-3">
                {jiraResult.error ? (
                  <p className="text-xs text-red-600">{jiraResult.error}</p>
                ) : (
                  <Badge variant="green">{jiraResult.synced} epics synced</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>AI Analysis</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-3">
              Re-analyze all CLAUDE.md files with GPT-5.6 Terra to refresh capability data.
            </p>
            <Button variant="primary" size="sm" onClick={runAIAnalysis} loading={aiLoading}>
              <Zap className="h-3.5 w-3.5" />
              Analyze All
            </Button>
            {aiResult && (
              <div className="mt-3">
                <Badge variant="green">{aiResult.analyzed} apps analyzed</Badge>
                {aiResult.stored && (
                  <div className="mt-2 space-y-0.5">
                    {aiResult.stored.map((s) => (
                      <p key={s.app} className="text-xs text-gray-500">{s.app}: {s.count} capabilities</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

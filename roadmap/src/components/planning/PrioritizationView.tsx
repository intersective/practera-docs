'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, AlertTriangle } from 'lucide-react';

interface Objective {
  id: number;
  name: string;
  priority: number;
}

interface PrioritizationViewProps {
  objectives: Objective[];
  year: number;
}

interface PrioritizedInitiative {
  id?: number;
  name: string;
  score: number;
  rationale: string;
  effort: string;
  impact: number;
}

interface GapResult {
  objectiveName: string;
  applicationName?: string;
  description: string;
  severity: string;
  suggestedInitiatives: string[];
}

interface AIResult {
  initiatives: PrioritizedInitiative[];
  gaps: GapResult[];
  suggestions?: {
    name: string;
    description: string;
    type: string;
    category: string;
    effort: string;
    impact: number;
    objectiveName: string;
    rationale: string;
  }[];
}

const severityColors: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'yellow',
  low: 'gray',
};

export function PrioritizationView({ objectives, year }: PrioritizationViewProps) {
  const [running, setRunning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [suggestions, setSuggestions] = useState<AIResult['suggestions']>([]);
  const [error, setError] = useState('');

  const runPrioritization = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/ai/prioritize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, objectiveIds: objectives.map((o) => o.id) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run prioritization');
    } finally {
      setRunning(false);
    }
  };

  const runSuggestions = async () => {
    setSuggesting(true);
    setError('');
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, objectiveIds: objectives.map((o) => o.id), count: 10 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={runPrioritization}
          loading={running}
          disabled={objectives.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          Run AI Prioritization
        </Button>
        <Button
          variant="secondary"
          onClick={runSuggestions}
          loading={suggesting}
          disabled={objectives.length === 0}
        >
          <Sparkles className="h-4 w-4" />
          Suggest {year} Initiatives
        </Button>
      </div>

      {objectives.length === 0 && (
        <p className="text-sm text-gray-500">Add at least one business objective to run AI analysis.</p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {result && result.initiatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prioritized Initiatives (AI Scored)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.initiatives
                .sort((a, b) => b.score - a.score)
                .map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-700 dark:text-primary-300">{item.score.toFixed(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                        <Badge variant="gray">{item.effort}</Badge>
                        <Badge variant="blue">Impact {item.impact}/5</Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.rationale}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result && result.gaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Identified Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.gaps.map((gap, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-2">
                    <Badge variant={(severityColors[gap.severity] as any) || 'gray'}>{gap.severity}</Badge>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{gap.description}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Objective: {gap.objectiveName}
                        {gap.applicationName && ` · App: ${gap.applicationName}`}
                      </p>
                      {gap.suggestedInitiatives.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {gap.suggestedInitiatives.map((s, j) => (
                            <li key={j} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                              <span className="text-gray-400">→</span> {s}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions && suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggested {year} Initiatives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                        <Badge variant="gray">{s.effort}</Badge>
                        <Badge variant="blue">{s.category}</Badge>
                        <Badge variant="green">Impact {s.impact}/5</Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{s.description}</p>
                      <p className="text-xs text-gray-500 mt-1">→ Addresses: <em>{s.objectiveName}</em></p>
                      <p className="text-xs text-gray-500 mt-0.5 italic">{s.rationale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

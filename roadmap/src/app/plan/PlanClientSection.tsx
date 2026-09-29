'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PrioritizationView } from '@/components/planning/PrioritizationView';
import { Plus } from 'lucide-react';

interface Objective {
  id: number;
  name: string;
  description?: string | null;
  year: number;
  priority: number;
}

interface PlanClientSectionProps {
  initialObjectives: Objective[];
  year: number;
}

const DEFAULT_OBJECTIVES = [
  'Improve ability to source project providers',
  'Improve customer expansion of Practera deployment',
  'Deliver more value to mentors and project providers',
  'Provide offerings direct to learners',
];

export function PlanClientSection({ initialObjectives, year }: PlanClientSectionProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initialObjectives);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('3');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, year, priority: parseInt(priority) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      setObjectives((prev) => [...prev, created].sort((a, b) => a.priority - b.priority));
      setName('');
      setDescription('');
      setPriority('3');
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [name, description, year, priority]);

  return (
    <div className="space-y-6 max-w-5xl">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Define business objectives for {year} and use AI to analyze gaps, prioritize existing initiatives, and suggest new ones.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objectives panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{year} Business Objectives</CardTitle>
                <Button size="sm" variant="primary" onClick={() => setShowForm((v) => !v)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {objectives.length === 0 ? (
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-2">No objectives added yet. Suggested objectives from PRD:</p>
                  <ul className="space-y-1">
                    {DEFAULT_OBJECTIVES.map((obj, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <Badge variant="blue">{i + 1}</Badge>
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  {objectives.map((obj) => (
                    <div key={obj.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Badge variant="blue">P{obj.priority}</Badge>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{obj.name}</p>
                        {obj.description && <p className="text-xs text-gray-500 mt-0.5">{obj.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add Objective</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <Input
                    label="Objective name"
                    placeholder="e.g. Improve ability to source project providers"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Textarea
                    label="Description (optional)"
                    placeholder="What does success look like?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                  <Select
                    label="Priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    options={[
                      { value: '1', label: '1 — Critical' },
                      { value: '2', label: '2 — High' },
                      { value: '3', label: '3 — Medium' },
                      { value: '4', label: '4 — Low' },
                      { value: '5', label: '5 — Nice to have' },
                    ]}
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" loading={saving}>Save Objective</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis & Planning</CardTitle>
            </CardHeader>
            <CardContent>
              <PrioritizationView objectives={objectives} year={year} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

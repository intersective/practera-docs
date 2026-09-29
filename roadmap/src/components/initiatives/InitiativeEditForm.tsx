'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface InitiativeData {
  id: number;
  name: string;
  description: string | null;
  status: string;
  type: string;
  category: string;
  year: number;
  startQuarter: string | null;
  endQuarter: string | null;
  effort: string | null;
  impact: number | null;
  jiraEpicKey: string | null;
  manuallyEdited: number;
  customerVisible: number;
  customerSummary: string | null;
}

interface Props {
  initiative: InitiativeData;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: 'planned',       label: 'Planned' },
  { value: 'inDevelopment', label: 'In Development' },
  { value: 'complete',      label: 'Complete' },
  { value: 'maintenance',   label: 'Maintenance' },
  { value: 'cancelled',     label: 'Cancelled' },
];

const CATEGORY_OPTIONS = [
  'PLATFORM', 'ADMIN', 'APP', 'MAINTENANCE', 'INFRA',
];

const TYPE_OPTIONS = [
  { value: 'feature',     label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'techDebt',    label: 'Tech Debt' },
];

const EFFORT_OPTIONS = ['S', 'M', 'L', 'XL'];

const QUARTER_OPTIONS = ['Q1', 'Q2', 'Q3', 'Q4'];

export function InitiativeEditForm({ initiative, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:         initiative.name,
    description:  initiative.description ?? '',
    status:       initiative.status,
    type:         initiative.type,
    category:     initiative.category,
    year:         initiative.year,
    startQuarter: initiative.startQuarter ?? '',
    endQuarter:   initiative.endQuarter ?? '',
    effort:       initiative.effort ?? '',
    impact:       initiative.impact?.toString() ?? '',
    jiraEpicKey:  initiative.jiraEpicKey ?? '',
    customerSummary: initiative.customerSummary ?? '',
    customerVisible: initiative.customerVisible === 1 ? '1' : '0',
  });

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name:         form.name.trim(),
      description:  form.description.trim() || null,
      status:       form.status,
      type:         form.type,
      category:     form.category,
      year:         Number(form.year),
      startQuarter: form.startQuarter || null,
      endQuarter:   form.endQuarter || null,
      effort:       form.effort || null,
      impact:       form.impact ? parseInt(form.impact, 10) : null,
      jiraEpicKey:  form.jiraEpicKey.trim() || null,
      customerSummary: form.customerSummary.trim() || null,
      customerVisible: form.customerVisible === '1' ? 1 : 0,
    };

    try {
      const res = await fetch(`/api/initiatives/${initiative.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Name
        </label>
        <input
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
        <p className="text-xs text-gray-500 mt-1">Internal only. This text is not published to customers.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Customer summary
        </label>
        <textarea
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.customerSummary}
          onChange={e => set('customerSummary', e.target.value)}
          placeholder="What a customer should understand, without delivery detail"
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.customerVisible === '1'}
            onChange={e => set('customerVisible', e.target.checked ? '1' : '0')}
          />
          Show on the public What’s coming page
        </label>
        <p className="text-xs text-gray-500 mt-1">
          A visible item is published only when this summary is filled in and the status is not cancelled.
        </p>
      </div>

      {/* Status — most prominent */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Status
        </label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => set('status', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                form.status === opt.value
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row: Year / Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
          <input
            type="number"
            min={2022}
            max={2030}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.year}
            onChange={e => set('year', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.type}
            onChange={e => set('type', e.target.value)}
          >
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Row: Category / Effort */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effort</label>
          <div className="flex gap-1.5">
            {EFFORT_OPTIONS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => set('effort', form.effort === e ? '' : e)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  form.effort === e
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Start / End Quarter */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Quarter</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.startQuarter}
            onChange={e => set('startQuarter', e.target.value)}
          >
            <option value="">—</option>
            {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Quarter</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.endQuarter}
            onChange={e => set('endQuarter', e.target.value)}
          >
            <option value="">—</option>
            {QUARTER_OPTIONS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>

      {/* Row: Impact / Jira */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Impact (1–5)</label>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => set('impact', form.impact === String(n) ? '' : String(n))}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  form.impact === String(n)
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-primary-400',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jira Epic Key</label>
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.jiraEpicKey}
            placeholder="PROJ-123"
            onChange={e => set('jiraEpicKey', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

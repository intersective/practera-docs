'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ExternalLink } from 'lucide-react';
import { Initiative } from '@/types/entities';
import { cn, statusLabel } from '@/lib/utils';

interface TimelineProps {
  initiatives: Initiative[];
  years?: number[];
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
type Quarter = typeof QUARTERS[number];

const CATEGORIES = ['PLATFORM', 'ADMIN', 'APP', 'MAINTENANCE', 'INFRA'] as const;
type Category = typeof CATEGORIES[number];

const STATUS_OPTIONS = [
  { value: 'planned',       label: 'Planned',     pill: 'bg-yellow-400 text-gray-900',  hover: 'hover:bg-yellow-500' },
  { value: 'inDevelopment', label: 'In Dev',       pill: 'bg-blue-500 text-white',       hover: 'hover:bg-blue-600' },
  { value: 'complete',      label: 'Complete',     pill: 'bg-green-500 text-white',      hover: 'hover:bg-green-600' },
  { value: 'maintenance',   label: 'Maintenance',  pill: 'bg-gray-400 text-white',       hover: 'hover:bg-gray-500' },
  { value: 'cancelled',     label: 'Cancelled',    pill: 'bg-red-400 text-white',        hover: 'hover:bg-red-500' },
] as const;

const STATUS_PILL: Record<string, string> = {
  complete:      'bg-green-500 text-white',
  inDevelopment: 'bg-blue-500 text-white',
  planned:       'bg-yellow-400 text-gray-900',
  maintenance:   'bg-gray-400 text-white',
  cancelled:     'bg-red-400 text-white line-through opacity-70',
};

const CATEGORY_DOT: Record<string, string> = {
  PLATFORM:    'bg-blue-500',
  ADMIN:       'bg-purple-500',
  APP:         'bg-green-500',
  MAINTENANCE: 'bg-gray-400',
  INFRA:       'bg-orange-500',
};

// ── Initiative Popup ─────────────────────────────────────────────────────────

interface PopupProps {
  initiative: Initiative;
  saving: boolean;
  onStatusChange: (id: number, status: string) => void;
  onClose: () => void;
}

function InitiativePopup({ initiative: item, saving, onStatusChange, onClose }: PopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0 mt-0.5', CATEGORY_DOT[item.category] ?? 'bg-gray-400')} />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{item.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">{item.category}</span>
          <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
            {item.year} {item.startQuarter ?? ''}
            {item.endQuarter && item.endQuarter !== item.startQuarter ? `–${item.endQuarter}` : ''}
          </span>
          {item.effort && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Effort: {item.effort}</span>
          )}
          {item.impact != null && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">Impact: {item.impact}/10</span>
          )}
        </div>

        {item.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
        )}

        {/* Quick status */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={saving}
                onClick={() => onStatusChange(item.id, opt.value)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full transition-all',
                  item.status === opt.value
                    ? cn(opt.pill, 'ring-2 ring-offset-1 ring-current scale-105')
                    : cn('bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300', opt.hover),
                  saving && 'opacity-50 cursor-wait',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer link */}
        <div className="pt-1 flex justify-end">
          <Link
            href={`/initiatives/${item.id}`}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            View / edit full details <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Timeline ─────────────────────────────────────────────────────────────

export function Timeline({ initiatives: seed, years = [2022, 2023, 2024, 2025, 2026, 2027] }: TimelineProps) {
  const [items, setItems] = useState<Initiative[]>(seed);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string | 'all'>('all');
  const [popupId, setPopupId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  // The popup always reads from current items state (not stale prop)
  const popupItem = popupId != null ? (items.find((i) => i.id === popupId) ?? null) : null;

  // ── Filtering ──

  const filteredYears = selectedYear === 'all' ? years : [selectedYear as number];

  const filtered = useMemo(() => items.filter((i) => {
    if (selectedYear !== 'all' && i.year !== selectedYear) return false;
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && i.status !== selectedStatus) return false;
    return true;
  }), [items, selectedYear, selectedCategory, selectedStatus]);

  const cellItems = useCallback((year: number, q: string, cat: string) =>
    filtered.filter((i) =>
      i.year === year &&
      i.category === cat &&
      (i.startQuarter === q || i.endQuarter === q || (!i.startQuarter && !i.endQuarter))
    ),
    [filtered],
  );

  // ── Smart year start: skip empty leading columns ──

  const allColumns = useMemo(
    () => filteredYears.flatMap((y) => QUARTERS.map((q) => ({ year: y, q }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredYears.join(',')],
  );

  const firstFilledIdx = useMemo(() => {
    return allColumns.findIndex(({ year: y, q }) =>
      CATEGORIES.some((cat) => cellItems(y, q, cat).length > 0)
    );
  }, [allColumns, cellItems]);

  const visibleColumns = firstFilledIdx >= 0 ? allColumns.slice(firstFilledIdx) : allColumns;

  // ── Optimistic status update + PATCH ──

  const handleStatusChange = useCallback(async (id: number, newStatus: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: newStatus } : i));
    setSaving(id);
    try {
      await fetch(`/api/initiatives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setSaving(null);
    }
  }, []);

  // ── Drag-and-drop ──

  const handleDrop = useCallback(async (targetYear: number, targetQ: string) => {
    if (!draggingId) return;
    const id = draggingId;
    setItems((prev) => prev.map((i) =>
      i.id === id ? { ...i, year: targetYear, startQuarter: targetQ } : i
    ));
    setDraggingId(null);
    setDragOverCell(null);
    setSaving(id);
    try {
      await fetch(`/api/initiatives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: targetYear, startQuarter: targetQ }),
      });
    } catch (e) {
      console.error('Failed to move initiative:', e);
    } finally {
      setSaving(null);
    }
  }, [draggingId]);

  // ── Escape key ──

  useEffect(() => {
    if (!popupId) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopupId(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [popupId]);

  const statuses = ['complete', 'inDevelopment', 'planned', 'maintenance', 'cancelled'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setSelectedYear('all')}
            className={cn(
              'px-3 py-1 text-sm rounded-lg border transition-colors',
              selectedYear === 'all'
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            )}
          >
            All years
          </button>
          {years.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setSelectedYear(y)}
              className={cn(
                'px-3 py-1 text-sm rounded-lg border transition-colors',
                selectedYear === y
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
              )}
            >
              {y}
            </button>
          ))}
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>

        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">{filtered.length} initiatives</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {statuses.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', STATUS_PILL[s]?.split(' ')[0] ?? 'bg-gray-300')} />
            <span className="text-gray-600 dark:text-gray-400">{statusLabel(s)}</span>
          </div>
        ))}
        <span className="text-gray-400 dark:text-gray-500 ml-2">· Click a pill to edit · Drag to move</span>
      </div>

      {/* Timeline table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table
          className="w-full text-sm border-collapse"
          style={{ minWidth: `${visibleColumns.length * 160 + 112}px` }}
        >
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="w-28 sticky left-0 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 z-10">
                Category
              </th>
              {visibleColumns.map(({ year: y, q }) => (
                <th
                  key={`${y}-${q}`}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 min-w-[160px]"
                >
                  <div className="text-gray-400 dark:text-gray-500 font-normal">{y}</div>
                  <div>{q}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((category) => {
              if (selectedCategory !== 'all' && selectedCategory !== category) return null;

              const hasCategoryData = visibleColumns.some(({ year: y, q }) =>
                cellItems(y, q, category).length > 0
              );

              return (
                <tr key={category} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="sticky left-0 bg-white dark:bg-gray-900 px-3 py-3 border-r border-gray-200 dark:border-gray-700 z-10 align-top">
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full flex-shrink-0', CATEGORY_DOT[category] ?? 'bg-gray-400')} />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{category}</span>
                    </div>
                    {!hasCategoryData && (
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-0.5 pl-4">—</p>
                    )}
                  </td>

                  {visibleColumns.map(({ year: y, q }) => {
                    const cellKey = `${y}-${q}`;
                    const cellItemList = cellItems(y, q, category);
                    const isOver = dragOverCell === `${cellKey}-${category}`;

                    return (
                      <td
                        key={`${cellKey}-${category}`}
                        className={cn(
                          'px-2 py-2 align-top border-r border-gray-100 dark:border-gray-800 min-w-[160px] transition-colors',
                          isOver && 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-400 dark:ring-blue-500',
                        )}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          setDragOverCell(`${cellKey}-${category}`);
                        }}
                        onDragLeave={(e) => {
                          // Only clear if leaving the cell itself, not a child
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            setDragOverCell(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          void handleDrop(y, q);
                        }}
                      >
                        <div className="space-y-1">
                          {cellItemList.map((item) => (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggingId(item.id);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(item.id));
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDragOverCell(null);
                              }}
                              onClick={() => setPopupId(item.id)}
                              className={cn(
                                'px-2 py-1 rounded text-xs font-medium truncate cursor-pointer select-none shadow-sm',
                                'hover:opacity-90 hover:shadow-md active:scale-95 transition-all',
                                STATUS_PILL[item.status] ?? 'bg-gray-200 text-gray-700',
                                draggingId === item.id && 'opacity-40 scale-95',
                                saving === item.id && 'animate-pulse',
                              )}
                              title={`${item.name} · ${statusLabel(item.status)} · Click to edit, drag to move`}
                            >
                              {item.name}
                            </div>
                          ))}

                          {/* Drop zone indicator when dragging */}
                          {isOver && draggingId != null && (
                            <div className="h-7 rounded border-2 border-dashed border-blue-400 dark:border-blue-500 flex items-center justify-center text-xs text-blue-400 dark:text-blue-500 pointer-events-none">
                              Drop here
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Initiative popup */}
      {popupItem && (
        <InitiativePopup
          initiative={popupItem}
          saving={saving === popupItem.id}
          onStatusChange={handleStatusChange}
          onClose={() => setPopupId(null)}
        />
      )}
    </div>
  );
}

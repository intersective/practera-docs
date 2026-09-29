'use client';

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { InitiativeEditForm } from './InitiativeEditForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

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
}

export function EditButton({ initiative }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card className="border-primary-200 dark:border-primary-800">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Edit Initiative</CardTitle>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Close editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {initiative.manuallyEdited === 1 && (
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
              ✎ This initiative has been manually edited — seeds will not overwrite it.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <InitiativeEditForm
            initiative={initiative}
            onClose={() => setEditing(false)}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </button>
  );
}

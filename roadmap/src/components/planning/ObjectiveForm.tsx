'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface ObjectiveFormProps {
  year: number;
  onSaved: () => void;
}

export function ObjectiveForm({ year, onSaved }: ObjectiveFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('3');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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

      setName('');
      setDescription('');
      setPriority('3');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Objective name"
        placeholder="e.g. Improve ability to source project providers"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Textarea
        label="Description (optional)"
        placeholder="More detail about what success looks like..."
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
      <Button type="submit" variant="primary" loading={saving}>
        Add Objective
      </Button>
    </form>
  );
}

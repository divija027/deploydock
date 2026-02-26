'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Plus, Trash2, Save } from 'lucide-react';

interface EnvEntry { key: string; value: string }

export function EnvVarsEditor({ appName }: { appName: string }) {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/docker/apps/${appName}/env`)
      .then(r => r.json())
      .then(setEntries)
      .catch(() => {});
  }, [appName]);

  const addRow = () => setEntries(e => [...e, { key: '', value: '' }]);
  const removeRow = (i: number) => setEntries(e => e.filter((_, idx) => idx !== i));
  const update = (i: number, field: 'key' | 'value', val: string) =>
    setEntries(e => e.map((entry, idx) => idx === i ? { ...entry, [field]: val } : entry));
  const toggleReveal = (i: number) =>
    setRevealed(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  const save = async () => {
    setSaving(true);
    await fetch(`/api/docker/apps/${appName}/env`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries.filter(e => e.key.trim())),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>KEY</span><span>VALUE</span><span /><span />
      </div>

      {entries.map((entry, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
          <Input
            value={entry.key}
            onChange={e => update(i, 'key', e.target.value)}
            placeholder="KEY"
            className="font-mono text-sm"
          />
          <Input
            type={revealed.has(i) ? 'text' : 'password'}
            value={entry.value}
            onChange={e => update(i, 'value', e.target.value)}
            placeholder="value"
            className="font-mono text-sm"
          />
          <Button size="icon" variant="ghost" onClick={() => toggleReveal(i)}>
            {revealed.has(i) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" /> Add variable
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Restart'}
        </Button>
      </div>
    </div>
  );
}

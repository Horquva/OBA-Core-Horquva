'use client';

import * as React from 'react';
import type { SyncableConnectionType } from '@/types/view';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { createConnection, syncConnection } from '@/lib/api/settings';
import { toApiError } from '@/lib/api/client';
import { ConnectionFields, TestConnectionButton, TYPE_LABELS, cleanConfig, isConfigComplete } from './ConnectionForm';

export interface AddConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a save (and the first sync was queued, if asked for). Mount it only while open, so it starts empty. */
  onSaved: (id: string) => void;
  /** Restrict the choice, e.g. the setup wizard's directory step. */
  types?: SyncableConnectionType[];
}

const ALL_TYPES: SyncableConnectionType[] = ['n8n', 'entra', 'google', 'ai_admin'];

export function AddConnectionModal({ isOpen, onClose, onSaved, types = ALL_TYPES }: AddConnectionModalProps) {
  const [type, setType] = React.useState<SyncableConnectionType>(types[0]);
  const [name, setName] = React.useState('');
  const [config, setConfig] = React.useState<Record<string, string>>({});
  const [syncNow, setSyncNow] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const chooseType = (t: SyncableConnectionType) => {
    setType(t);
    setConfig({}); // never carry a secret over to another service
  };

  const canSave = name.trim() !== '' && isConfigComplete(type, config) && !saving;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { id } = await createConnection({ type, name: name.trim(), config: cleanConfig(type, config) });
      setConfig({});
      // The connection exists now; a failed first sync is shown on its card (with Sync now), not here,
      // so nobody saves it a second time.
      if (syncNow) await syncConnection(id).catch(() => undefined);
      onSaved(id);
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Add a connection"
      description="Settings are encrypted on the server and never shown again. To change them later, enter them anew."
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!canSave} isLoading={saving}>
            {syncNow ? 'Save and sync' : 'Save'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {types.length > 1 && (
          <fieldset className="space-y-2">
            <legend className="font-semibold text-ink mb-1">Service</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {types.map((t) => (
                <label key={t} className="flex items-center gap-2 rounded-control border border-rule p-2.5 cursor-pointer has-[:checked]:border-amber has-[:checked]:bg-amber/10">
                  <input type="radio" name="connection-type" value={t} checked={type === t} onChange={() => chooseType(t)} />
                  <span className="text-ink">{TYPE_LABELS[t]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-1.5">
          <label htmlFor="connection-name" className="font-semibold text-ink block">Name</label>
          <input
            id="connection-name"
            className="w-full rounded-control border border-rule bg-surface p-2.5 text-xs text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            placeholder={`e.g. Production ${TYPE_LABELS[type].split(' ')[0]}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <ConnectionFields type={type} config={config} onChange={setConfig} idPrefix="add-connection" />
        <TestConnectionButton type={type} config={config} />

        <label className="flex items-center gap-2 text-ink">
          <input type="checkbox" checked={syncNow} onChange={(e) => setSyncNow(e.target.checked)} />
          Run the first sync right after saving
        </label>

        {error && (
          <div role="alert" className="rounded-control bg-st-fail/10 border border-st-fail/20 p-3 text-st-fail">
            {error}
          </div>
        )}
      </div>
    </Drawer>
  );
}

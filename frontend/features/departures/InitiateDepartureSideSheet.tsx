'use client';

import * as React from 'react';
import type { EntityRef } from '@/types/view';
import { SideSheet } from '@/components/ui/SideSheet';
import { Button } from '@/components/ui/Button';
import { PersonPicker, PersonItem } from '@/components/ui/PersonPicker';
import { initiateDeparture } from '@/lib/api/departures';
import { fetchPeople } from '@/lib/api/entities';
import { useResource } from '@/lib/useResource';
import { useToast } from '@/components/ui/Toast';

export interface InitiateDepartureSideSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (newDepartureId: string) => void;
  availablePeople?: PersonItem[];
}

export function InitiateDepartureSideSheet({
  open,
  onClose,
  onSuccess,
  availablePeople,
}: InitiateDepartureSideSheetProps) {
  const { toast } = useToast();
  // Real people from the backend unless the caller supplies them (tests/stories).
  const peopleResource = useResource(open && !availablePeople ? 'people-picker' : null, fetchPeople);
  const people: PersonItem[] = availablePeople ?? (peopleResource.status === 'ready' ? peopleResource.data : []);
  const peopleError = !availablePeople && peopleResource.status === 'error';
  const [selectedPerson, setSelectedPerson] = React.useState<EntityRef | null>(null);
  const [leaveDate, setLeaveDate] = React.useState('');
  const [note, setNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !leaveDate) {
      setError('Please select a person and enter a leave date.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const id = await initiateDeparture({
        personId: selectedPerson.id,
        leaveDate,
        note: note.trim() || null,
      });

      toast({
        title: 'Departure initiated',
        description: `Handover tracking opened for ${selectedPerson.name}.`,
      });

      setSelectedPerson(null);
      setLeaveDate('');
      setNote('');
      onSuccess?.(id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate departure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title="Initiate Departure"
      description="Record an upcoming offboarding to start succession assignment and risk monitoring."
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!selectedPerson || !leaveDate || isSubmitting}
          >
            {isSubmitting ? 'Initiating...' : 'Initiate Departure'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {error && (
          <div className="rounded-control bg-st-fail/10 border border-st-fail/30 p-3 text-xs text-st-fail">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-ink uppercase tracking-wider">
            Departing Employee *
          </label>
          <PersonPicker
            value={selectedPerson}
            onChange={setSelectedPerson}
            options={people}
            placeholder="Search employee by name..."
          />
          {peopleError && (
            <p className="text-[11px] text-st-fail">
              Couldn't load people.{' '}
              <button type="button" className="underline" onClick={peopleResource.reload}>Retry</button>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="leave-date" className="text-xs font-semibold text-ink uppercase tracking-wider">
            Effective Leave Date *
          </label>
          <input
            id="leave-date"
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            className="w-full rounded-control border border-rule bg-surface px-3 py-2 text-sm text-ink focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            required
          />
          <p className="text-[11px] text-ink-3">
            Handover workbench will track continuity up to and past this date.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="departure-note" className="text-xs font-semibold text-ink uppercase tracking-wider">
            Transition Notes (Optional)
          </label>
          <textarea
            id="departure-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Relocating abroad, handover target date Nov 15th..."
            className="w-full rounded-control border border-rule bg-surface p-3 text-sm text-ink placeholder:text-ink-3 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber resize-none"
          />
        </div>
      </form>
    </SideSheet>
  );
}

import { DEPARTURE_STAGES, type DepartureSummary, type HandoverAsset } from '@/types/view';

export type DepartureStatus = 'needs_successor' | 'on_track' | 'handed_over' | 'verified';

/** One status per departure, from counted facts only (stage, alert, handover counts). */
export function departureStatus(d: Pick<DepartureSummary, 'stage' | 'hasAlert' | 'assetsHandedOver' | 'assetsTotal'>): DepartureStatus {
  if (d.stage === 'verified') return 'verified';
  if (d.hasAlert) return 'needs_successor';
  if (d.assetsTotal > 0 && d.assetsHandedOver === d.assetsTotal) return 'handed_over';
  return 'on_track';
}

export const STATUS_LABEL: Record<DepartureStatus, string> = {
  needs_successor: 'Needs successor',
  on_track: 'On track',
  handed_over: 'Handed over',
  verified: 'Verified',
};

/** Pill colours: red and green only for state, always with the label beside them. */
export const STATUS_PILL: Record<DepartureStatus, string> = {
  needs_successor: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
  on_track: 'bg-surface-sunken text-ink-2',
  handed_over: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  verified: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
};

export const SOURCE_LABEL: Record<DepartureSummary['detectedFrom'], string> = {
  manual: 'Recorded in OBA',
  entra: 'Microsoft Entra',
  google: 'Google Workspace',
};

/** 1-based step of the 5-step lifecycle. */
export const stepOf = (stage: DepartureSummary['stage']) => DEPARTURE_STAGES.indexOf(stage) + 1;

export const ACCEPTANCE_LABEL: Record<HandoverAsset['acceptance'], string> = {
  none: 'Not asked',
  requested: 'Awaiting',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const ACCEPTANCE_PILL: Record<HandoverAsset['acceptance'], string> = {
  none: 'bg-surface-sunken text-ink-3',
  requested: 'bg-[color-mix(in_srgb,var(--amber)_16%,transparent)] text-amber-ink',
  accepted: 'bg-[color-mix(in_srgb,var(--st-pass)_13%,transparent)] text-st-pass',
  declined: 'bg-[color-mix(in_srgb,var(--st-fail)_12%,transparent)] text-st-fail',
};

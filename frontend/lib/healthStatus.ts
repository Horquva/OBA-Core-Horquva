/**
 * Shared coloring for the org-health STABLE/WARNING/CRITICAL band
 * (backend/domain/derived.js's orgHealth(), >=70/>=45) — including its
 * lowercase form (backend/domain/simulations.js's healthStatusFor(), the
 * same thresholds, used for simulated before/after health). Several
 * components used to re-threshold the raw 0-100 score themselves instead of
 * trusting the status the backend already computed, and disagreed with each
 * other (and with the backend) at the boundaries. Consuming the status string
 * here instead of the number means a component can't invent its own cutoff.
 */

export type HealthStatus = 'STABLE' | 'WARNING' | 'CRITICAL';

const COLOR: Record<HealthStatus, string> = {
  STABLE: '#4ade80',
  WARNING: '#facc15',
  CRITICAL: '#f87171',
};

const TEXT_CLASS: Record<HealthStatus, string> = {
  STABLE: 'text-emerald-400',
  WARNING: 'text-amber-400',
  CRITICAL: 'text-red-400',
};

const BG_CLASS: Record<HealthStatus, string> = {
  STABLE: 'bg-emerald-400',
  WARNING: 'bg-amber-400',
  CRITICAL: 'bg-red-400',
};

const GRADIENT_CLASS: Record<HealthStatus, string> = {
  STABLE: 'from-emerald-600 to-emerald-400',
  WARNING: 'from-amber-500 to-amber-400',
  CRITICAL: 'from-red-600 to-red-400',
};

/** Normalizes either casing ('STABLE' or 'stable') to the canonical enum, falling back to CRITICAL for missing/unrecognized input rather than guessing safe. */
export function normalizeHealthStatus(status: string | null | undefined): HealthStatus {
  const upper = (status ?? '').toUpperCase();
  return upper === 'STABLE' || upper === 'WARNING' || upper === 'CRITICAL' ? upper : 'CRITICAL';
}

export function healthStatusColor(status: string | null | undefined): string {
  return COLOR[normalizeHealthStatus(status)];
}

export function healthStatusTextClass(status: string | null | undefined): string {
  return TEXT_CLASS[normalizeHealthStatus(status)];
}

export function healthStatusBgClass(status: string | null | undefined): string {
  return BG_CLASS[normalizeHealthStatus(status)];
}

export function healthStatusGradientClass(status: string | null | undefined): string {
  return GRADIENT_CLASS[normalizeHealthStatus(status)];
}

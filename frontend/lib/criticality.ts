import { RiskLevel } from '../types';

/**
 * Resolves an agent's criticality from a raw API row.
 *
 * This exact expression was duplicated verbatim across 12 files (every page
 * that fetches /api/agents), each independently deciding to default missing
 * criticality to 'low' -- the same fabricate-a-safe-default anti-pattern the
 * backend's F-G' finding already fixed (an unmeasured asset must not be
 * presented as the safest-looking value). Not changed to an 'unknown'
 * sentinel here: RiskLevel has no such value, and every consumer of
 * `criticality` (badge colors, filters, sort order) assumes one of the 4 real
 * levels -- that's a larger, separate fix, deliberately left alone. This
 * function exists so that fix only has to happen in one place.
 */
export function resolveCriticality(raw: { risk?: string; criticality?: string }): RiskLevel {
  return (raw.risk || raw.criticality || 'low') as RiskLevel;
}

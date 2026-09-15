import { RiskLevel, Dependency } from '../types';

/**
 * Resolves an agent's criticality from a raw API row.
 *
 * This exact expression was duplicated verbatim across 12 files (every page
 * that fetches /api/agents), each independently deciding to default missing
 * criticality to 'low' -- the same fabricate-a-safe-default anti-pattern the
 * backend's F-G' finding already fixed (an unmeasured asset must not be
 * presented as the safest-looking value). F-11: RiskLevel now carries an
 * `unknown` sentinel (mirroring backend/domain/definitions.js's UNKNOWN)
 * specifically so this function stops lying. This is the one place that
 * fallback happens -- every consumer of `criticality` now has to handle
 * `unknown` because this function can actually return it.
 */
export function resolveCriticality(raw: { risk?: string; criticality?: string }): RiskLevel {
  return (raw.risk || raw.criticality || 'unknown') as RiskLevel;
}

/**
 * FE-5: two vocabularies for the same rank scale, carried since day one.
 * `RiskLevel` ('low'|'medium'|'high'|'critical') labels entities (agents,
 * workflows, knowledge assets); `Dependency['type']`
 * ('low'|'normal'|'high'|'critical') labels edges. This mirrors
 * backend/domain/definitions.js's D-65 exactly, for the same reason: the two
 * words are not typos of each other, they come from different source
 * columns (entity risk/criticality columns use 'medium', the
 * `dependencies.dependency_type` column uses 'normal'). D-65 did not
 * collapse them to one spelling -- it aliased their RANK so comparisons and
 * sorting work correctly across both without either vocabulary losing its
 * own label. Nothing on the frontend had the same alias, so any code
 * needing to rank or compare across both (or a component like RiskBadge,
 * whose `level` prop already loosely accepts either) had no canonical way
 * to do it, and DependencyEvolutionTab.tsx had grown its own local,
 * un-aliased order array as a symptom.
 */
export const RISK_RANK: Record<RiskLevel | Dependency['type'], number> = {
  unknown: -1,
  low: 0,
  normal: 1,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * True when `level` is at least as severe as `threshold`, across either
 * vocabulary. `unknown` on either side always yields false -- mirrors
 * backend/domain/definitions.js's atOrAbove() exactly: an unmeasured thing
 * is never proven to meet a bar, and an unmeasured bar can never be met.
 * (RISK_RANK still ranks `unknown` below `low` rather than omitting it, so
 * a plain numeric sort by RISK_RANK sinks unscored items to the bottom
 * without needing this function.)
 */
export function atOrAbove(level: RiskLevel | Dependency['type'], threshold: RiskLevel | Dependency['type']): boolean {
  if (level === 'unknown' || threshold === 'unknown') return false;
  return RISK_RANK[level] >= RISK_RANK[threshold];
}

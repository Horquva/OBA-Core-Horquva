// =============================================================================
// Horquva Continuity Platform — The central key rule
// =============================================================================
// Vendor keys (OpenAI / Anthropic workload keys) are owned like assets but are
// not handed over: they are rotated or revoked. So "what a person owns"
// excludes them unless a caller opts in (ContinuityGraph.getOwnedAssets).
// Callers that opt in: person holdings, work at risk, the S1 leaver
// simulation's keysAtRisk, the post-departure verifier and the orphan scan.
// =============================================================================

/** A workload key from an AI vendor, as the key connectors write it. */
export function isVendorKey(entityId: string): boolean {
  return entityId.startsWith('credential:openai:') || entityId.startsWith('credential:anthropic:');
}

/** Vendor timestamps arrive as ISO strings or Unix seconds; anything unreadable is null. */
export function vendorTimestamp(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = typeof value === 'number' ? new Date(value < 1e11 ? value * 1000 : value) : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

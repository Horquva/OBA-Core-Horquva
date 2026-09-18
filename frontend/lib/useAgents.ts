'use client';

import { useEffect, useState } from 'react';
import { request, ApiError } from './api';
import { normalizeAgent, RawAgent } from './normalize';
import type { Agent } from '../types';

/**
 * Shared fetch + normalization for GET /api/agents.
 *
 * AgentTable, Heatmap and RiskSplit all mount on the same dashboard render
 * and each used to independently fetch and normalize the same dataset --
 * three network calls (and three near-identical copies of the department-
 * fallback / criticality-resolution / owner-flattening logic) for one
 * shared list. A module-level promise cache means the first mount fetches,
 * every other mount in the same page load reuses that in-flight (or
 * settled) promise -- no new dependency (SWR/React Query), just one fetch
 * instead of N. Normalization itself now reuses lib/normalize.ts's
 * normalizeAgent() rather than a fourth hand-copied version of the same
 * owner-flattening/department-fallback logic that function's own docstring
 * already found nine copies of.
 *
 * A failed fetch clears the cache so the next mount (e.g. after a retry
 * or navigation back to the dashboard) gets a fresh attempt rather than
 * being stuck replaying a stale rejection.
 */
let cached: Promise<Agent[]> | null = null;

function fetchAgents(): Promise<Agent[]> {
  if (!cached) {
    cached = request<unknown>('/api/agents')
      .then((data) => (Array.isArray(data) ? (data as RawAgent[]).map(normalizeAgent) : []))
      .catch((err) => {
        cached = null;
        throw err;
      });
  }
  return cached;
}

/**
 * Drops the cached agents list so the next mount of AgentTable/Heatmap/
 * RiskSplit refetches instead of replaying stale owner data. A successful
 * fetch never expired on its own -- only a failed one cleared `cached` --
 * so PATCH /api/agents/:id/owner (app/ownership/page.tsx's assign-owner
 * flow) reassigning an agent left every dashboard component that already
 * mounted this hook showing the previous owner until a full page reload,
 * even though the backend caches were already invalidated
 * (clearCachesAfterOwnerChange, backend/routes/agents.js).
 */
export function invalidateAgentsCache() {
  cached = null;
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAgents()
      .then((data) => { if (!cancelled) setAgents(data); })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? `${err.status} — ${err.message}` : 'Failed to load agents');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { agents, loading, error };
}

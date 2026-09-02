'use client';

import { useEffect, useState } from 'react';
import { authHeader } from './authFetch';
import { resolveCriticality } from './criticality';
import type { Agent } from '../types';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

interface RawAgentOwner {
  name: string;
  department?: string;
}

interface RawAgent {
  id: string;
  name: string;
  department?: string;
  owner?: string | RawAgentOwner | null;
  backup_owner?: string | RawAgentOwner | null;
  risk?: string;
  criticality?: string;
  documented?: boolean;
}

function ownerName(owner: string | RawAgentOwner | null | undefined): string | null {
  if (!owner) return null;
  return typeof owner === 'object' ? owner.name : owner;
}

function normalize(raw: RawAgent): Agent {
  return {
    id: raw.id,
    name: raw.name,
    department: raw.department || (typeof raw.owner === 'object' && raw.owner?.department) || 'Unassigned',
    criticality: resolveCriticality(raw),
    owner: ownerName(raw.owner),
    backup_owner: ownerName(raw.backup_owner),
    documented: Boolean(raw.documented),
  };
}

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
 * instead of N.
 *
 * A failed fetch clears the cache so the next mount (e.g. after a retry
 * or navigation back to the dashboard) gets a fresh attempt rather than
 * being stuck replaying a stale rejection.
 */
let cached: Promise<Agent[]> | null = null;

function fetchAgents(): Promise<Agent[]> {
  if (!cached) {
    cached = fetch(`${BASE}/api/agents`, { headers: authHeader() })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Failed to load agents (${r.status})`))))
      .then((data: unknown) => (Array.isArray(data) ? (data as RawAgent[]).map(normalize) : []))
      .catch((err) => {
        cached = null;
        throw err;
      });
  }
  return cached;
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load agents');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { agents, loading, error };
}

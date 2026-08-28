import { useEffect, useState } from 'react';
import { authHeader } from './authFetch';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

export interface SearchEntry {
  id: string;
  title: string;
  type: 'Workflow' | 'Person' | 'Agent' | 'Tool';
  category: string;
  url: string;
}

interface RawIndexItem {
  id?: string | number;
  name?: string;
  role?: string;
  department?: string;
  category?: string;
  owner?: { department?: string } | string | null;
}

async function safeJson(path: string): Promise<RawIndexItem[]> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', headers: authHeader() });
    const data = res.ok ? await res.json() : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Live global-search index built from real agents/workflows/employees/tools —
 * replaces a hardcoded fixture (a fake "Payroll Processing" workflow and
 * "Sarah Jenkins", neither of which exist anywhere else in the app).
 */
export async function fetchSearchIndex(): Promise<SearchEntry[]> {
  const [agents, workflows, employees, tools] = await Promise.all([
    safeJson('/api/agents'),
    safeJson('/api/workflows'),
    safeJson('/api/employees'),
    safeJson('/api/tools'),
  ]);

  const entries: SearchEntry[] = [];

  agents.forEach((a) => entries.push({
    id: `agent-${a.id}`,
    title: a.name ?? '',
    type: 'Agent',
    category: (typeof a.owner === 'object' && a.owner?.department) || 'AI Agents',
    url: '/ai-tools',
  }));

  workflows.forEach((w) => entries.push({
    id: `workflow-${w.id}`,
    title: w.name ?? '',
    type: 'Workflow',
    category: w.department || 'Operations',
    url: '/workflows',
  }));

  employees.forEach((e) => entries.push({
    id: `person-${e.id}`,
    title: e.role ? `${e.name} (${e.role})` : (e.name ?? ''),
    type: 'Person',
    category: e.department || 'People',
    url: '/ownership',
  }));

  tools.forEach((t) => entries.push({
    id: `tool-${t.id}`,
    title: t.name ?? '',
    type: 'Tool',
    category: t.category || 'AI Tools',
    url: '/ai-tools',
  }));

  return entries;
}

/** Client hook — fetches once on mount, cached for the component's lifetime. */
export function useSearchIndex() {
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchSearchIndex()
      .then((entries) => { if (!cancelled) setIndex(entries); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { index, loading };
}

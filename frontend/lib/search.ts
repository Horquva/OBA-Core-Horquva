import { useEffect, useRef, useState } from 'react';
import { request } from './api';

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
  const data = await request<unknown>(path, { cache: 'no-store' }).catch(() => []);
  return Array.isArray(data) ? (data as RawIndexItem[]) : [];
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

/**
 * Client hook, cached for the component's lifetime. `enabled` defaults to
 * true for any caller that always wants the index; `GlobalSearchOverlay`
 * passes `isSearchOpen` instead, so the four index fetches (agents/
 * workflows/employees/tools) only happen the first time a user actually
 * opens the command palette, not on every page's initial mount.
 * `fetchedRef` is read and written only inside the effect (never during
 * render), so closing and reopening the palette re-runs the effect but does
 * not re-fetch.
 */
export function useSearchIndex(enabled: boolean = true) {
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    fetchSearchIndex()
      .then((entries) => { if (!cancelled) setIndex(entries); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { index, loading };
}

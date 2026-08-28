import { useEffect, useState } from 'react';
import { NotificationItem, NotificationGroup, NotificationSeverity } from '../types/notification';
import { authHeader } from './authFetch';

const BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function groupFor(iso?: string | null): NotificationGroup {
  if (!iso) return 'Today';
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

const KNOWN_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);
function severityFrom(s?: string | null): NotificationSeverity {
  const v = String(s || '').toLowerCase();
  return (KNOWN_SEVERITIES.has(v) ? v : 'medium') as NotificationSeverity;
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, { cache: 'no-store', headers: authHeader() });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

interface EscalationRaw {
  id: string | number;
  reason?: string;
  detail?: string;
  workflow_id?: string | number;
  severity?: string;
  status?: string;
  created_at?: string | null;
}

interface GovernanceIntentRaw {
  id: string | number;
  title?: string;
  description?: string;
  priority?: string;
  raised_at?: string | null;
  status?: string;
}

interface SelfHealingIssueRaw {
  id: string | number;
  type?: string;
  description?: string;
  severity?: string;
  detectedAt?: string | null;
}

interface ContinuityPlanRaw {
  area?: string;
  status?: string;
}

/**
 * Live notifications assembled from the same four real backend modules the
 * NotificationSource type already names (Avatar/Governance/Self Healing/
 * Continuity) — replaces two separate hardcoded fixtures (a fake "Sarah
 * Jenkins"-style panel list and a fake WF-001/A-14 page list) that showed
 * invented alerts on every page regardless of real system state.
 */
export async function fetchLiveNotifications(): Promise<NotificationItem[]> {
  const [escalations, governance, selfHealing, continuity] = await Promise.all([
    safeJson<EscalationRaw[]>('/api/avatar/escalations'),
    safeJson<{ pendingIntents?: GovernanceIntentRaw[] }>('/api/automation/governance'),
    safeJson<{ issues?: SelfHealingIssueRaw[] }>('/api/self-healing/detect'),
    safeJson<{ continuityPlans?: ContinuityPlanRaw[] }>('/api/automation/continuity'),
  ])

  const items: NotificationItem[] = []

  ;(Array.isArray(escalations) ? escalations : []).forEach((e) => {
    items.push({
      id: `avatar-${e.id}`,
      title: e.reason ? titleCase(String(e.reason)) : 'Escalation',
      description: e.detail || `Workflow ${e.workflow_id} was escalated and needs review.`,
      severity: severityFrom(e.severity),
      source: 'Avatar',
      group: groupFor(e.created_at),
      time: timeAgo(e.created_at),
      acknowledged: e.status !== 'open',
      // No dedicated Avatar page exists — M21 (Executive Avatar Intelligence)
      // surfaces on the Dashboard, per commandIndex.ts's own module mapping.
      link: '/',
      moduleLabel: 'Avatar',
    })
  })

  ;(governance?.pendingIntents || []).forEach((d) => {
    items.push({
      id: `governance-${d.id}`,
      title: d.title ?? '',
      description: d.description ?? '',
      severity: severityFrom(d.priority),
      source: 'Governance',
      group: groupFor(d.raised_at),
      time: timeAgo(d.raised_at),
      acknowledged: d.status !== 'pending',
      // No standalone /governance route exists — governance surfaces inside
      // Continuity & Governance (the "Governance Heatmap" / "Compliance
      // Governance" sections).
      link: '/continuity',
      moduleLabel: 'Governance',
    })
  })

  ;(selfHealing?.issues || []).forEach((i) => {
    items.push({
      id: `selfhealing-${i.id}`,
      title: i.type ?? '',
      description: i.description ?? '',
      severity: severityFrom(i.severity),
      source: 'Self Healing',
      group: groupFor(i.detectedAt),
      time: timeAgo(i.detectedAt),
      acknowledged: false,
      // No standalone /self-healing route exists — it surfaces inside
      // Workflows' "Self-Healing Feed" section.
      link: '/workflows',
      moduleLabel: 'Self-Healing',
    })
  })

  ;(continuity?.continuityPlans || []).forEach((c, idx) => {
    items.push({
      id: `continuity-${idx}`,
      title: `Backup coverage recommended: ${c.area}`,
      description: `No documented backup owner for "${c.area}" — a backup owner is recommended.`,
      severity: 'medium',
      source: 'Continuity',
      group: 'Today',
      time: 'ongoing',
      acknowledged: c.status !== 'recommended',
      link: '/continuity',
      moduleLabel: 'Continuity',
    })
  })

  return items
}

/** Client hook — fetches once on mount. Used by both the slide-out panel and /notifications. */
export function useLiveNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchLiveNotifications()
      .then((items) => { if (!cancelled) setNotifications(items) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { notifications, loading }
}

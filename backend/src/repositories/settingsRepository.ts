// =============================================================================
// Horquva Continuity Platform — Users, organization settings, change feed and
// audit trail repositories
// =============================================================================

import type { AuditEntry, OrgSettings, StoredChangeEvent, UserAccount } from '../services/dataService.js';
import { query as defaultQuery } from '../db/client.js';
import type { Query } from './graphRepository.js';

const iso = (v: unknown): string | null => (v ? (v instanceof Date ? v : new Date(v as string)).toISOString() : null);

// ── Users ────────────────────────────────────────────────────────────────────
export async function listUsers(q: Query = defaultQuery): Promise<UserAccount[]> {
  const res = await q(`SELECT id, name, email, role, is_hr_manager, title FROM user_account ORDER BY created_at, id`);
  return (res.rows as any[]).map((r) => ({
    id: r.id, name: r.name, email: r.email, role: r.role, isHrManager: r.is_hr_manager, title: r.title ?? null,
  }));
}

export async function saveUser(u: UserAccount, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO user_account (id, name, email, role, is_hr_manager, title)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role,
       is_hr_manager = EXCLUDED.is_hr_manager, title = EXCLUDED.title, updated_at = NOW()`,
    [u.id, u.name, u.email.toLowerCase(), u.role, u.isHrManager, u.title]
  );
}

export async function deleteUser(id: string, q: Query = defaultQuery): Promise<void> {
  await q(`DELETE FROM user_account WHERE id = $1`, [id]);
}

// ── Organization ─────────────────────────────────────────────────────────────
export interface StoredOrgSettings extends OrgSettings {
  onboardingDismissedAt: string | null;
}

export async function getOrganization(q: Query = defaultQuery): Promise<StoredOrgSettings | null> {
  const res = await q(`SELECT * FROM organization_settings WHERE id = 'default'`);
  const r: any = res.rows[0];
  if (!r) return null;
  return {
    companyName: r.company_name,
    logoUrl: r.logo_url ?? null,
    minGroupSize: r.min_group_size,
    departmentMappings: r.department_mappings ?? [],
    onboardingDismissedAt: iso(r.onboarding_dismissed_at),
  };
}

export async function saveOrganization(o: OrgSettings & { onboardingDismissedAt?: string | null }, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO organization_settings (id, company_name, logo_url, min_group_size, department_mappings, onboarding_dismissed_at, updated_at)
     VALUES ('default', $1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       company_name = EXCLUDED.company_name, logo_url = EXCLUDED.logo_url,
       min_group_size = EXCLUDED.min_group_size, department_mappings = EXCLUDED.department_mappings,
       onboarding_dismissed_at = EXCLUDED.onboarding_dismissed_at, updated_at = NOW()`,
    [o.companyName, o.logoUrl, o.minGroupSize, JSON.stringify(o.departmentMappings), o.onboardingDismissedAt ?? null]
  );
}

// ── Change feed ──────────────────────────────────────────────────────────────
export async function listChangeEvents(q: Query = defaultQuery): Promise<StoredChangeEvent[]> {
  const res = await q(`SELECT id, kind, title, impact, href, detected_at, acknowledged_at, acknowledged_by FROM change_event ORDER BY detected_at DESC, id`);
  return (res.rows as any[]).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    impact: r.impact,
    href: r.href ?? null,
    detectedAt: iso(r.detected_at)!,
    acknowledged: r.acknowledged_at !== null,
    acknowledgedAt: iso(r.acknowledged_at),
    acknowledgedBy: r.acknowledged_by ?? null,
  }));
}

export async function saveChangeEvent(c: StoredChangeEvent, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO change_event (id, kind, title, impact, href, detected_at, acknowledged_at, acknowledged_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET acknowledged_at = EXCLUDED.acknowledged_at, acknowledged_by = EXCLUDED.acknowledged_by`,
    [c.id, c.kind, c.title, c.impact, c.href, c.detectedAt, c.acknowledged ? c.acknowledgedAt ?? new Date().toISOString() : null, c.acknowledgedBy ?? null]
  );
}

// ── Audit trail ──────────────────────────────────────────────────────────────
export async function listRecentAudit(limit: number, q: Query = defaultQuery): Promise<AuditEntry[]> {
  const res = await q(
    `SELECT id, created_at, user_id, action, resource_id, details FROM audit_log ORDER BY created_at DESC, id LIMIT $1`,
    [limit]
  );
  return (res.rows as any[]).map((r) => ({
    id: r.id,
    at: iso(r.created_at)!,
    actor: r.user_id ?? 'system',
    action: r.action,
    resource: r.resource_id ?? '',
    details: typeof r.details?.text === 'string' ? r.details.text : JSON.stringify(r.details ?? {}),
  }));
}

export async function appendAudit(e: AuditEntry, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [e.id, e.actor, e.action, e.resource.split(':')[0] || null, e.resource, JSON.stringify({ text: e.details }), e.at]
  );
}

// =============================================================================
// Horquva Continuity Platform — Action record repository (status / accepted risk)
// =============================================================================

import type { ActionRecord } from '../services/dataService.js';
import { query as defaultQuery } from '../db/client.js';
import type { Query } from './graphRepository.js';

const iso = (v: unknown): string | null => (v ? (v instanceof Date ? v : new Date(v as string)).toISOString() : null);

export async function listActions(q: Query = defaultQuery): Promise<ActionRecord[]> {
  const res = await q(`SELECT * FROM action_record`);
  return (res.rows as any[]).map((r) => ({
    id: r.id,
    checkId: r.check_id,
    entityId: r.entity_id,
    status: r.status,
    ...(r.accepted_risk_reason
      ? { acceptedRisk: { reason: r.accepted_risk_reason, expiresAt: iso(r.accepted_risk_expires_at)!, acceptedBy: r.accepted_risk_by } }
      : {}),
    ...(r.resolved_at ? { resolvedAt: iso(r.resolved_at) } : {}),
  }));
}

export async function saveAction(a: ActionRecord, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO action_record (id, check_id, entity_id, status, accepted_risk_reason, accepted_risk_expires_at, accepted_risk_by, resolved_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       accepted_risk_reason = EXCLUDED.accepted_risk_reason,
       accepted_risk_expires_at = EXCLUDED.accepted_risk_expires_at,
       accepted_risk_by = EXCLUDED.accepted_risk_by,
       resolved_at = EXCLUDED.resolved_at,
       updated_at = NOW()`,
    [
      a.id, a.checkId, a.entityId, a.status,
      a.acceptedRisk?.reason ?? null, a.acceptedRisk?.expiresAt ?? null, a.acceptedRisk?.acceptedBy ?? null,
      a.resolvedAt ?? null,
    ]
  );
}

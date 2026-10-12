// =============================================================================
// Horquva Continuity Platform — Departure repository (departure + handovers)
// =============================================================================

import type { DepartureRecord } from '../services/dataService.js';
import { query as defaultQuery, withTransaction } from '../db/client.js';
import type { Query } from './graphRepository.js';

const iso = (v: unknown): string => (v instanceof Date ? v : new Date(v as string)).toISOString();

export async function listDepartures(q: Query = defaultQuery): Promise<DepartureRecord[]> {
  const [deps, hands] = await Promise.all([
    q(`SELECT * FROM departure`),
    q(`SELECT * FROM departure_handover ORDER BY departure_id, position, id`),
  ]);
  const byDep = new Map<string, DepartureRecord['handovers']>();
  for (const h of hands.rows as any[]) {
    const list = byDep.get(h.departure_id) ?? [];
    list.push({
      id: h.id,
      assetId: h.asset_id,
      successorId: h.successor_id ?? null,
      acceptance: h.acceptance,
      declineReason: h.decline_reason ?? null,
    });
    byDep.set(h.departure_id, list);
  }
  return (deps.rows as any[]).map((r) => ({
    id: r.id,
    personId: r.person_id,
    leaveDate: iso(r.leave_date),
    stage: r.stage,
    note: r.note ?? null,
    detectedFrom: r.detected_from,
    stageTimestamps: r.stage_timestamps ?? {},
    handovers: byDep.get(r.id) ?? [],
    ...(r.handover_pack ? { handoverPack: r.handover_pack } : {}),
    ...(r.watch_log?.length ? { watchLog: r.watch_log } : {}),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  }));
}

/** Upserts the departure and its handovers in one transaction (handovers are never removed). */
export async function saveDeparture(d: DepartureRecord): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO departure (id, person_id, leave_date, stage, note, detected_from, stage_timestamps, handover_pack, watch_log, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         leave_date = EXCLUDED.leave_date,
         stage = EXCLUDED.stage,
         note = EXCLUDED.note,
         stage_timestamps = EXCLUDED.stage_timestamps,
         handover_pack = EXCLUDED.handover_pack,
         watch_log = EXCLUDED.watch_log,
         updated_at = EXCLUDED.updated_at`,
      [
        d.id, d.personId, d.leaveDate, d.stage, d.note, d.detectedFrom,
        JSON.stringify(d.stageTimestamps), d.handoverPack ? JSON.stringify(d.handoverPack) : null,
        JSON.stringify(d.watchLog ?? []), d.createdAt, d.updatedAt,
      ]
    );
    if (d.handovers.length === 0) return;
    await client.query(
      `INSERT INTO departure_handover (id, departure_id, asset_id, successor_id, acceptance, decline_reason, position, updated_at)
       SELECT id, $2, asset_id, successor_id, acceptance, decline_reason, position, NOW()
         FROM jsonb_to_recordset($1::jsonb) AS x(id text, asset_id text, successor_id text, acceptance text, decline_reason text, position int)
       ON CONFLICT (id) DO UPDATE SET
         successor_id = EXCLUDED.successor_id,
         acceptance = EXCLUDED.acceptance,
         decline_reason = EXCLUDED.decline_reason,
         updated_at = NOW()`,
      [
        JSON.stringify(d.handovers.map((h, position) => ({
          id: h.id, asset_id: h.assetId, successor_id: h.successorId, acceptance: h.acceptance, decline_reason: h.declineReason ?? null, position,
        }))),
        d.id,
      ]
    );
  });
}

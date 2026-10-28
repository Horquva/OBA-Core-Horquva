// =============================================================================
// Horquva Continuity Platform — Graph repository (entity / edge / fact)
// =============================================================================
// Reads the active SCD2 rows the in-memory ContinuityGraph is built from, and
// writes the edge changes the app makes (assign backup, attestation). Facts
// are versioned through FactStore's Postgres adapter, not here.
// =============================================================================

import type { CanonicalEdge, CanonicalEntity, CanonicalFact, EdgeType, EvidenceGrade, EntityKind, FactAttribute, OwnerKind } from '@horquva/types';
import { query as defaultQuery } from '../db/client.js';

export type Query = typeof defaultQuery;

export interface GraphSnapshot {
  entities: CanonicalEntity[];
  edges: CanonicalEdge[];
  facts: CanonicalFact[];
}

const date = (v: unknown): Date => (v instanceof Date ? v : new Date(v as string));

export async function loadActiveGraph(q: Query = defaultQuery): Promise<GraphSnapshot> {
  const [ent, edg, fct] = await Promise.all([
    q(`SELECT id, kind, name, description, external_refs, created_at, updated_at FROM entity`),
    q(`SELECT id, from_id, to_id, type, grade, source, source_ref, owner_kind, valid_from FROM edge WHERE valid_to IS NULL`),
    q(`SELECT id, entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from FROM fact WHERE valid_to IS NULL`),
  ]);
  return {
    entities: ent.rows.map((r: any) => ({
      id: r.id,
      kind: r.kind as EntityKind,
      name: r.name,
      description: r.description ?? undefined,
      externalRefs: r.external_refs ?? {},
      createdAt: date(r.created_at),
      updatedAt: date(r.updated_at),
    })),
    edges: edg.rows.map((r: any) => ({
      id: r.id,
      fromId: r.from_id,
      toId: r.to_id,
      type: r.type as EdgeType,
      grade: r.grade as EvidenceGrade,
      source: r.source,
      sourceRef: r.source_ref ?? undefined,
      ...(r.owner_kind ? { ownerKind: r.owner_kind as OwnerKind } : {}),
      validFrom: date(r.valid_from),
      validTo: null,
    })),
    facts: fct.rows.map((r: any) => ({
      id: r.id,
      entityId: r.entity_id,
      attribute: r.attribute as FactAttribute,
      value: r.value, // pg decodes JSONB
      grade: r.grade as EvidenceGrade,
      source: r.source,
      sourceRef: r.source_ref ?? undefined,
      attestedBy: r.attested_by ?? null,
      validFrom: date(r.valid_from),
      validTo: null,
    })),
  };
}

export async function countEntities(q: Query = defaultQuery): Promise<number> {
  const res = await q(`SELECT COUNT(*)::int AS n FROM entity`);
  return res.rows[0].n;
}

/** Bulk-loads a snapshot in three statements (demo seeding). */
export async function insertSnapshot(snap: GraphSnapshot, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO entity (id, kind, name, description, external_refs, created_at, updated_at)
     SELECT id, kind, name, description, COALESCE(external_refs, '{}'::jsonb), COALESCE(created_at, NOW()), COALESCE(updated_at, NOW())
       FROM jsonb_to_recordset($1::jsonb) AS x(id text, kind text, name text, description text, external_refs jsonb, created_at timestamptz, updated_at timestamptz)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(snap.entities.map((e) => ({
      id: e.id, kind: e.kind, name: e.name, description: e.description ?? null,
      external_refs: e.externalRefs ?? {}, created_at: e.createdAt ?? null, updated_at: e.updatedAt ?? null,
    })))]
  );
  await q(
    `INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, owner_kind, valid_from, valid_to)
     SELECT from_id, to_id, type, grade, source, source_ref, owner_kind, COALESCE(valid_from, NOW()), valid_to
       FROM jsonb_to_recordset($1::jsonb) AS x(from_id text, to_id text, type text, grade text, source text, source_ref text, owner_kind text, valid_from timestamptz, valid_to timestamptz)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(snap.edges.map((e) => ({
      from_id: e.fromId, to_id: e.toId, type: e.type, grade: e.grade, source: e.source,
      source_ref: e.sourceRef ?? null, owner_kind: e.ownerKind ?? null, valid_from: e.validFrom ?? null, valid_to: e.validTo ?? null,
    })))]
  );
  await q(
    `INSERT INTO fact (entity_id, attribute, value, grade, source, source_ref, attested_by, valid_from, valid_to)
     SELECT entity_id, attribute, value, grade, source, source_ref, attested_by, COALESCE(valid_from, NOW()), valid_to
       FROM jsonb_to_recordset($1::jsonb) AS x(entity_id text, attribute text, value jsonb, grade text, source text, source_ref text, attested_by text, valid_from timestamptz, valid_to timestamptz)
     ON CONFLICT DO NOTHING`,
    [JSON.stringify(snap.facts.map((f) => ({
      entity_id: f.entityId, attribute: f.attribute, value: f.value, grade: f.grade, source: f.source,
      source_ref: f.sourceRef ?? null, attested_by: f.attestedBy ?? null, valid_from: f.validFrom ?? null, valid_to: f.validTo ?? null,
    })))]
  );
}

export async function insertEdge(edge: CanonicalEdge, q: Query = defaultQuery): Promise<void> {
  await q(
    `INSERT INTO edge (from_id, to_id, type, grade, source, source_ref, owner_kind, valid_from)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING`,
    [edge.fromId, edge.toId, edge.type, edge.grade, edge.source, edge.sourceRef ?? null, edge.ownerKind ?? null, edge.validFrom ?? new Date()]
  );
}

export async function closeEdges(edges: CanonicalEdge[], q: Query = defaultQuery): Promise<void> {
  for (const e of edges) {
    await q(
      `UPDATE edge SET valid_to = $4 WHERE from_id = $1 AND to_id = $2 AND type = $3 AND valid_to IS NULL`,
      [e.fromId, e.toId, e.type, e.validTo ?? new Date()]
    );
  }
}

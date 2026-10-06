import type { EntityKind, EntityRef } from '@/types/view';
import { request } from './client';

const nameCache = new Map<string, string>();

/** Existing: GET /api/continuity/inventory?kind= (returns raw entity rows). */
export async function fetchEntities(kind: EntityKind): Promise<EntityRef[]> {
  const r = await request<{ entities: Array<{ id: string; kind: EntityKind; name: string }> }>(
    `/api/continuity/inventory?kind=${encodeURIComponent(kind)}`,
  );
  const refs = r.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name }));
  refs.forEach((e) => nameCache.set(e.id, e.name));
  return refs;
}

/** Name for an id seen by fetchEntities; falls back to the id itself. */
export function lookupEntityName(id: string): string {
  return nameCache.get(id) ?? id;
}

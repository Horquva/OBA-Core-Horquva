import type { EntityKind, EntityRef } from '@/types/view';
import { request } from './client';

/** Existing: GET /api/continuity/inventory?kind= (returns raw entity rows). */
export async function fetchEntities(kind: EntityKind): Promise<EntityRef[]> {
  const r = await request<{ entities: Array<{ id: string; kind: EntityKind; name: string }> }>(
    `/api/continuity/inventory?kind=${encodeURIComponent(kind)}`,
  );
  return r.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name }));
}

/** Every entity in the graph (Map root picker, What-If services/assets picker). */
export async function fetchAllEntities(): Promise<EntityRef[]> {
  const r = await request<{ entities: Array<{ id: string; kind: EntityKind; name: string }> }>('/api/continuity/inventory');
  return r.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name }));
}

/** People for the person pickers (departing employee, successors), with emails for search. */
export async function fetchPeople(): Promise<Array<EntityRef & { email?: string }>> {
  const r = await request<{ entities: Array<{ id: string; kind: EntityKind; name: string; external_refs?: { email?: string } }> }>(
    '/api/continuity/inventory?kind=person',
  );
  return r.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, email: e.external_refs?.email }));
}

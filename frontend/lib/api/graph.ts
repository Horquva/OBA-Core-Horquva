import type { BlastRadius, Neighbourhood } from '@/types/view';
import { request } from './client';

export function fetchNeighbourhood(rootId: string, hops: 1 | 2 = 2): Promise<Neighbourhood> {
  return request<Neighbourhood>(`/api/graph/neighbourhood?root=${encodeURIComponent(rootId)}&hops=${hops}`); // (planned) B-11
}

export function fetchBlastRadius(rootId: string): Promise<BlastRadius> {
  return request<BlastRadius>(`/api/graph/blast-radius?root=${encodeURIComponent(rootId)}`); // (planned) B-11
}

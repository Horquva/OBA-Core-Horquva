import type { AssetDetail, AssetRow } from '@/types/view';
import { request } from './client';

export async function fetchAssets(): Promise<AssetRow[]> {
  const r = await request<{ assets: AssetRow[] }>('/api/assets'); // (planned) B-06
  return r.assets;
}

export function fetchAssetDetail(id: string): Promise<AssetDetail> {
  return request<AssetDetail>(`/api/assets/${encodeURIComponent(id)}`); // (planned) B-06
}

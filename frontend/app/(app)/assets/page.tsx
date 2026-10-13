import * as React from 'react';
import { AssetsView } from '@/features/assets/AssetsView';

/** ?status=covered|exposed|unknown filters the list; ?id= opens that asset's drawer. */
export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ status?: string; id?: string }> }) {
  const { status, id } = await searchParams;
  return <AssetsView key={`${status ?? ''}-${id ?? ''}`} initialStatus={status ?? null} defaultSelectedAssetId={id ?? null} />;
}

import * as React from 'react';
import { MapView } from '@/features/map/MapView';

export default async function MapPage({ searchParams }: { searchParams: Promise<{ root?: string | string[] }> }) {
  const { root } = await searchParams;
  return <MapView initialRootId={typeof root === 'string' ? root : undefined} />;
}

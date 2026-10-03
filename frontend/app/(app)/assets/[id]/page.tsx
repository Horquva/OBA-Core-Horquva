import * as React from 'react';
import { AssetDetailView } from '@/features/assets/AssetDetailView';

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssetDetailView id={id} />;
}


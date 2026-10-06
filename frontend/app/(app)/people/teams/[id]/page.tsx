import * as React from 'react';
import { TeamDetail } from '@/features/people/TeamDetail';

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TeamDetail id={id} />;
}


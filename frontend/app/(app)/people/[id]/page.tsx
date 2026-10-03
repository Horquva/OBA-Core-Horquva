import * as React from 'react';
import { PersonDetail } from '@/features/people/PersonDetail';

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PersonDetail id={id} />;
}


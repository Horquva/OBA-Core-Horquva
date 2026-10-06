import * as React from 'react';
import { DepartureDetail } from '@/features/departures/DepartureDetail';

export default async function DepartureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DepartureDetail id={id} />;
}

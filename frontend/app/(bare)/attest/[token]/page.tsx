import * as React from 'react';
import { AttestForm } from '@/features/attest/AttestForm';

export const metadata = {
  title: 'Asset Attestation | OBA Horquva',
  description: 'Self-service continuity and ownership attestation.',
};

export default async function AttestTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <React.Suspense fallback={<div className="min-h-screen bg-canvas flex items-center justify-center text-xs text-ink-3">Loading confirmation...</div>}>
      <AttestForm token={token} />
    </React.Suspense>
  );
}

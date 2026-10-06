import * as React from 'react';
import { IdentityQueueView } from '@/features/settings/IdentityQueueView';

export const metadata = {
  title: 'Identity Queue | Settings | OBA Horquva',
  description: 'Resolve unmatched third-party creators and service accounts.',
};

export default function IdentityQueuePage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading queue...</div>}>
      <IdentityQueueView />
    </React.Suspense>
  );
}

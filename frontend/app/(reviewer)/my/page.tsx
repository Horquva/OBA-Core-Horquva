import * as React from 'react';
import { ReviewerView } from '@/features/reviewer/ReviewerView';

export const metadata = {
  title: 'My Review Tasks | OBA Horquva',
  description: 'System ownership confirmations and successor handover requests.',
};

export default function ReviewerMyPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-ink-3">Loading review tasks...</div>}>
      <ReviewerView />
    </React.Suspense>
  );
}

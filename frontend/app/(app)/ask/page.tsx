import * as React from 'react';
import { AskView } from '@/features/ask/AskView';

export const metadata = {
  title: 'Ask Horquva | OBA',
  description: 'Continuity intelligence assistant grounded in verified SCD2 facts.',
};

export default function AskPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-ink-3">Loading assistant...</div>}>
      <AskView />
    </React.Suspense>
  );
}

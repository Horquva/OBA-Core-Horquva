import * as React from 'react';
import { AskView } from '@/features/ask/AskView';

export const metadata = {
  title: 'Ask OBA | Horquva',
  description: 'Ask about owners, backups, departures and what breaks — answered from your records.',
};

// Ask OBA is the home page. useSearchParams (?q=, ?c=) needs a Suspense boundary.
export default function HomePage() {
  return (
    <React.Suspense fallback={null}>
      <AskView />
    </React.Suspense>
  );
}

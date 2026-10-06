import * as React from 'react';
import { N8nCheckView } from '@/features/settings/N8nCheckView';

export const metadata = {
  title: 'n8n Ownership Scan | Settings | OBA Horquva',
  description: 'Stateless in-memory scan auditing n8n workflow single points of failure.',
};

export default function N8nCheckPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading diagnostic...</div>}>
      <N8nCheckView />
    </React.Suspense>
  );
}

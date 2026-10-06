import * as React from 'react';
import { OrganizationView } from '@/features/settings/OrganizationView';

export const metadata = {
  title: 'Organization | Settings | OBA Horquva',
  description: 'Configure company branding, logo, and team aggregation floor rules.',
};

export default function OrganizationSettingsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading organization...</div>}>
      <OrganizationView />
    </React.Suspense>
  );
}

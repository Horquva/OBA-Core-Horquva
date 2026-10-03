import * as React from 'react';
import { UsersView } from '@/features/settings/UsersView';

export const metadata = {
  title: 'Users & Roles | Settings | OBA Horquva',
  description: 'Manage users, access permissions, and HR privileges.',
};

export default function UsersSettingsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading users...</div>}>
      <UsersView />
    </React.Suspense>
  );
}

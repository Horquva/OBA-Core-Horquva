import * as React from 'react';
import { ConnectionsView } from '@/features/settings/ConnectionsView';

export const metadata = {
  title: 'Connections & Sync | Settings | OBA Horquva',
  description: 'Manage integrations for n8n, Entra ID, Google Workspace, and AI models.',
};

export default function ConnectionsSettingsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading connectors...</div>}>
      <ConnectionsView />
    </React.Suspense>
  );
}

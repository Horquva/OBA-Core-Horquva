import * as React from 'react';
import { AuditLogView } from '@/features/settings/AuditLogView';

export const metadata = {
  title: 'Audit Trail | Settings | OBA Horquva',
  description: 'Tamper-evident log of system modifications and attestation events.',
};

export default function AuditLogSettingsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-center text-xs text-ink-3">Loading audit trail...</div>}>
      <AuditLogView />
    </React.Suspense>
  );
}

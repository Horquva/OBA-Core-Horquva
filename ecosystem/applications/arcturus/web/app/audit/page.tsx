'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/DataTable';

interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
}

const mockAuditLogs: AuditEntry[] = [
  { id: 'LOG-8801', actor: 'saba.m@org.internal', action: 'CREATE_RUN', resource: 'RUN-102', timestamp: '2026-08-24 11:00:02', ipAddress: '192.168.1.45' },
  { id: 'LOG-8802', actor: 'system.daemon', action: 'UPDATE_VALIDATION', resource: 'VAL-001', timestamp: '2026-08-24 10:15:30', ipAddress: '127.0.0.1' },
  { id: 'LOG-8803', actor: 'umair.a@org.internal', action: 'OVERRIDE_STATUS', resource: 'RUN-104', timestamp: '2026-08-23 12:15:10', ipAddress: '192.168.1.12' },
  { id: 'LOG-8804', actor: 'system.daemon', action: 'AUTO_TRIGGER_AUDIT', resource: 'VAL-004', timestamp: '2026-08-23 12:10:00', ipAddress: '127.0.0.1' },
];

export default function AuditPage() {
  const columns: Column<AuditEntry>[] = [
    { header: 'Log ID', accessorKey: 'id', sortable: true },
    { header: 'Actor', accessorKey: 'actor', sortable: true },
    { header: 'Action', accessorKey: 'action', sortable: true },
    { header: 'Resource Target', accessorKey: 'resource', sortable: true },
    { header: 'Timestamp', accessorKey: 'timestamp', sortable: true },
    { header: 'IP Address', accessorKey: 'ipAddress', sortable: false },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-white">System Audit Logs</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Immutable audit trails for security compliance and governance verification.
        </p>
      </div>

      <Card bordered className="p-0 overflow-hidden">
        <DataTable columns={columns} data={mockAuditLogs} emptyMessage="No audit logs recorded." />
      </Card>
    </div>
  );
}
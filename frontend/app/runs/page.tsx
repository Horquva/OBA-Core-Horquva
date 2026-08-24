'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, StatusType } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';

interface ExecutionRunDetail {
  id: string;
  name: string;
  model: string;
  status: StatusType;
  duration: string;
  timestamp: string;
}

const mockRuns: ExecutionRunDetail[] = [
  { id: 'RUN-101', name: 'Constitutional Guardrail Check A', model: 'GPT-4o', status: 'VALIDATED', duration: '1.2s', timestamp: '2026-08-24 10:15' },
  { id: 'RUN-102', name: 'Safety & Bias Audit B', model: 'Claude 3.5 Sonnet', status: 'RUNNING', duration: 'In progress', timestamp: '2026-08-24 11:00' },
  { id: 'RUN-103', name: 'Policy Adherence Scan', model: 'Llama 3.1 70B', status: 'INCONCLUSIVE', duration: '4.8s', timestamp: '2026-08-23 16:45' },
  { id: 'RUN-104', name: 'Toxic Output Filter Check', model: 'GPT-4o-mini', status: 'REJECTED', duration: '0.9s', timestamp: '2026-08-23 12:10' },
  { id: 'RUN-105', name: 'System Context Verification', model: 'Gemini 1.5 Pro', status: 'COMPLETED', duration: '2.1s', timestamp: '2026-08-22 09:30' },
];

export default function RunsPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredRuns = mockRuns.filter((run) => {
    if (filter === 'ALL') return true;
    return run.status === filter;
  });

  const columns: Column<ExecutionRunDetail>[] = [
    { header: 'Run ID', accessorKey: 'id', sortable: true },
    { header: 'Execution Name', accessorKey: 'name', sortable: true },
    { header: 'Model Used', accessorKey: 'model', sortable: true },
    {
      header: 'Status',
      accessorKey: (row) => <Badge status={row.status} />,
      sortable: false,
    },
    { header: 'Latency', accessorKey: 'duration', sortable: true },
    { header: 'Timestamp', accessorKey: 'timestamp', sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Execution Runs</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor and inspect historical AI governance run executions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {['ALL', 'VALIDATED', 'RUNNING', 'INCONCLUSIVE', 'REJECTED'].map((statusKey) => (
          <Button
            key={statusKey}
            variant={filter === statusKey ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setFilter(statusKey)}
          >
            {statusKey}
          </Button>
        ))}
      </div>

      {/* Runs Table */}
      <Card bordered className="p-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredRuns}
          emptyMessage="No runs found matching the selected status."
        />
      </Card>
    </div>
  );
}
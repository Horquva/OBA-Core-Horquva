<<<<<<< HEAD
export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Arcturus Simulation Platform</h1>
      <p className="mt-4">Welcome to the Dashboard. Please select a module from the left menu.</p>
=======
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column } from '@/components/ui/DataTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface ExecutionRun {
  id: string;
  name: string;
  status: 'VALIDATED' | 'RUNNING' | 'INCONCLUSIVE' | 'REJECTED';
  timestamp: string;
  accuracy: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<ExecutionRun[]>([]);

  useEffect(() => {
    // Simulating API Data Load
    const timer = setTimeout(() => {
      setRuns([
        { id: 'RUN-101', name: 'Constitutional Guardrail Check A', status: 'VALIDATED', timestamp: '2026-08-24 10:15', accuracy: '99.4%' },
        { id: 'RUN-102', name: 'Safety & Bias Audit B', status: 'RUNNING', timestamp: '2026-08-24 11:00', accuracy: '88.2%' },
        { id: 'RUN-103', name: 'Policy Adherence Scan', status: 'INCONCLUSIVE', timestamp: '2026-08-23 16:45', accuracy: '74.0%' },
        { id: 'RUN-104', name: 'Toxic Output Filter Check', status: 'REJECTED', timestamp: '2026-08-23 12:10', accuracy: '45.1%' },
      ]);
      setLoading(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  const columns: Column<ExecutionRun>[] = [
    { header: 'Run ID', accessorKey: 'id', sortable: true },
    { header: 'Name', accessorKey: 'name', sortable: true },
    { 
      header: 'Status', 
      accessorKey: (row) => <Badge status={row.status} />,
      sortable: false 
    },
    { header: 'Timestamp', accessorKey: 'timestamp', sortable: true },
    { header: 'Accuracy', accessorKey: 'accuracy', sortable: true },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">Real-time AI governance and constitutional validation tracking.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setLoading(true)}>
            Refresh Data
          </Button>
          <Button variant="primary" size="sm">
            + New Validation Run
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Executions</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-extrabold text-white">1,248</p>
            <p className="text-xs text-emerald-400 mt-2">↑ 12% from last week</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Constitutional Score</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-extrabold text-emerald-400">98.6%</p>
            <p className="text-xs text-zinc-400 mt-2">Optimal system alignment</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Flagged Violations</p>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-extrabold text-rose-400">3</p>
            <p className="text-xs text-rose-400/80 mt-2">Requires immediate audit</p>
          </CardBody>
        </Card>
      </div>

      {/* Recent Executions Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">Recent Executions</h2>
        {loading ? (
          <LoadingSpinner label="Fetching execution logs..." size="lg" />
        ) : (
          <DataTable columns={columns} data={runs} emptyMessage="No execution records found." />
        )}
      </div>
>>>>>>> 5a87bb0 (feat(arcturus): migrate reusable UI components, dashboard layout, and governance pages)
    </div>
  );
}
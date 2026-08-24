'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '../../services/api';
import { WorkflowStepChain } from '../../components/workflows/WorkflowStepChain';
import { CollisionDetector } from '../../components/workflows/CollisionDetector';
import { VerificationLedger } from '../../components/workflows/VerificationLedger';
import { SelfHealingFeed } from '../../components/workflows/SelfHealingFeed';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<any[]>('/api/workflows')
      .then((data) => {
        setWorkflows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Visual Guard 1: LOADING
  if (loading) {
    return (
      <div className="space-y-8 pb-12 animate-pulse max-w-7xl mx-auto px-6">
        <div className="h-16 bg-[var(--border-subtle)] rounded-lg w-1/3"></div>
        <div className="h-64 bg-[var(--border-subtle)] rounded-xl w-full"></div>
        <div className="h-48 bg-[var(--border-subtle)] rounded-xl w-full"></div>
      </div>
    );
  }

  // Visual Guard 2: FAILED / UNAVAILABLE
  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl mt-10 max-w-7xl mx-auto">
        <h3 className="font-semibold text-lg mb-2">Backend Connection Unavailable</h3>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  // Visual Guard 3: EMPTY DATASET
  if (workflows.length === 0) {
    return (
      <div className="p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl mt-10 max-w-7xl mx-auto">
        <h3 className="text-zinc-300 font-medium text-lg mb-1">No Workflows Available</h3>
        <p className="text-zinc-500 text-sm">Backend returned an empty dataset. No active workflows detected.</p>
      </div>
    );
  }

  // Visual Guard 4: DATA READY
  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="animate-fade-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gradient tracking-tight mb-1">
            Workflow &amp; Orchestration
          </h1>
          <p className="text-[color:var(--text-secondary)] text-sm">
            End-to-end workflow intelligence, collision detection, verification audit trail,
            and self-healing status.
          </p>
        </div>
      </div>

      <WorkflowStepChain />
      <CollisionDetector />
      <VerificationLedger />
      <SelfHealingFeed />
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';

interface ProvenanceRecord {
  experiment_id: string;
  run_id: string;
  seed: number;
  tick: number;
  event_id: string;
  entity_id: string | null;
  parent_hashes: string[];
  lineage_hash: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface UseProvenanceLineageState {
  records: ProvenanceRecord[];
  lineageAvailable: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage provenance lineage for an experiment.
 * Lineage enables tracing every artifact back to root experiment configuration.
 */
export function useProvenanceLineage(experimentId: string): UseProvenanceLineageState {
  const [records, setRecords] = useState<ProvenanceRecord[]>([]);
  const [lineageAvailable, setLineageAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLineage = async () => {
    if (!experimentId) {
      setError('Experiment ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/arcturus/provenance/${experimentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        setError(`Failed to fetch provenance lineage: ${response.statusText}`);
      } else {
        const data = await response.json();
        setRecords(data.records || []);
        setLineageAvailable(data.lineage_available || false);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setRecords([]);
      setLineageAvailable(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLineage();
  }, [experimentId]);

  return {
    records,
    lineageAvailable,
    loading,
    error,
    refetch: fetchLineage,
  };
}

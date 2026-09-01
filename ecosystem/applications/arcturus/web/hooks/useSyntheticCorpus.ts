'use client';

import { useEffect, useState } from 'react';
import type { SyntheticDataCorpusPreview } from '../lib/types';

interface UseSyntheticCorpusState {
  corpus: SyntheticDataCorpusPreview | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage provisional synthetic data corpus for a simulation run.
 * Frontend labels this as "provisional" because artifacts are pre-validation.
 */
export function useSyntheticCorpus(runId: string): UseSyntheticCorpusState {
  const [corpus, setCorpus] = useState<SyntheticDataCorpusPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCorpus = async () => {
    if (!runId) {
      setError('Run ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/arcturus/synthetic-data/${runId}/corpus`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        setError(`Failed to fetch synthetic corpus: ${response.statusText}`);
      } else {
        const data = await response.json();
        setCorpus(data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setCorpus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorpus();
  }, [runId]);

  return {
    corpus,
    loading,
    error,
    refetch: fetchCorpus,
  };
}

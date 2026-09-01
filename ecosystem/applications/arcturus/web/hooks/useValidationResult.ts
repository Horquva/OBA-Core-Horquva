'use client';

import { useEffect, useState } from 'react';
import type { ValidationResultContract } from '../lib/types';

interface UseValidationResultState {
  result: ValidationResultContract | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage validation results for an experiment.
 * Polls the backend until validation results are available.
 */
export function useValidationResult(experimentId: string): UseValidationResultState {
  const [result, setResult] = useState<ValidationResultContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchValidationResult = async () => {
    if (!experimentId) {
      setError('Experiment ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/arcturus/validation/${experimentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setResult(null);
          setError(null); // 404 is expected if validation not yet available
        } else {
          setError(`Failed to fetch validation results: ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        setResult(data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationResult();
  }, [experimentId]);

  return {
    result,
    loading,
    error,
    refetch: fetchValidationResult,
  };
}

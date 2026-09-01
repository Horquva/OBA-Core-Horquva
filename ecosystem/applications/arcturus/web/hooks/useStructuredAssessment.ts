'use client';

import { useEffect, useState } from 'react';
import type { StructuredAssessment } from '../lib/types';

interface UseStructuredAssessmentState {
  assessment: StructuredAssessment | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage structured intelligence assessments for an experiment.
 * Assessments are only available after validation completes and Gemini analysis runs.
 */
export function useStructuredAssessment(experimentId: string): UseStructuredAssessmentState {
  const [assessment, setAssessment] = useState<StructuredAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessment = async () => {
    if (!experimentId) {
      setError('Experiment ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/arcturus/intelligence/${experimentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setAssessment(null);
          setError(null); // 404 is expected if assessment not yet available
        } else {
          setError(`Failed to fetch assessment: ${response.statusText}`);
        }
      } else {
        const data = await response.json();
        setAssessment(data);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [experimentId]);

  return {
    assessment,
    loading,
    error,
    refetch: fetchAssessment,
  };
}

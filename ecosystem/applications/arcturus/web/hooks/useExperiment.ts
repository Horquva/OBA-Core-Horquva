import { useState, useEffect } from 'react';
import { experimentApi } from '../lib/api-client';

export function useExperiment() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = async () => {
    setLoading(true);
    try {
      const data = await experimentApi.listExperiments();
      if (data) {
        setExperiments(data);
      }
    } catch (err) {
      console.warn('[FALLBACK / ERROR TRIGGERED] useExperiment: Failed to fetch experiments list from backend API. Setting error state.', err);
      setError('Failed to fetch experiments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  return { experiments, loading, error, refetch: fetchExperiments };
}

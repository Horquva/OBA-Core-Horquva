import { useState, useEffect } from 'react';
import { dashboardApi, experimentApi } from '../lib/api-client';
import type { KpiMetric, Signal, SystemHealth, ExperimentPerformance, Insight } from '../lib/types';

export function useDashboardKpis() {
  const [data, setData] = useState<KpiMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getKpis()
      .then(setData)
      .catch((err) => {
        console.warn('[FALLBACK / ERROR TRIGGERED] useDashboardKpis: Failed to fetch /api/v1/dashboard/kpis. Diverting to empty metrics list.', err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useDashboardSignals() {
  const [data, setData] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSignals()
      .then(setData)
      .catch((err) => {
        console.warn('[FALLBACK / ERROR TRIGGERED] useDashboardSignals: Failed to fetch /api/v1/dashboard/signals. Diverting to empty signals list.', err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useActiveExperiment() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getActiveSimulation()
      .then(setData)
      .catch((err) => {
        console.warn('[FALLBACK / ERROR TRIGGERED] useActiveExperiment: Failed to fetch /api/v1/runtime/active. Defaulting to null (idle state).', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useExperimentPerformance(experimentId?: string) {
  const [data, setData] = useState<ExperimentPerformance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!experimentId) {
      setLoading(false);
      return;
    }
    experimentApi.getPerformance(experimentId)
      .then(setData)
      .catch((err) => {
        console.warn(`[FALLBACK / ERROR TRIGGERED] useExperimentPerformance: Failed to fetch performance for ${experimentId}.`, err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [experimentId]);

  return { data, loading };
}

export function useIntelligenceInsights() {
  const [data, setData] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getInsights()
      .then(setData)
      .catch((err) => {
        console.warn('[FALLBACK / ERROR TRIGGERED] useIntelligenceInsights: Failed to fetch insights. Defaulting to empty list.', err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

export function useSystemHealth() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSystemHealth()
      .then(setData)
      .catch((err) => {
        console.warn('[FALLBACK / ERROR TRIGGERED] useSystemHealth: Failed to fetch system health. Defaulting to null.', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[API ERROR / DEVIATION] GET ${endpoint} responded with status ${response.status} (${response.statusText}).`);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API CALL FAILED] GET ${endpoint} failed:`, err);
      throw err;
    }
  },

  post: async <T>(endpoint: string, data: any): Promise<T> => {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        console.warn(`[API ERROR / DEVIATION] POST ${endpoint} responded with status ${response.status} (${response.statusText}). Payload:`, data);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API CALL FAILED] POST ${endpoint} failed:`, err);
      throw err;
    }
  },
};

export const experimentApi = {
  listExperiments: async () => {
    return await apiClient.get<any[]>('/api/v1/experiments');
  },
  getExperiment: async (id: string) => {
    return await apiClient.get<any>(`/api/v1/experiments/${id}`);
  },
  createExperiment: async (data: { name: string; seed?: number; config?: any }) => {
    return await apiClient.post<any>('/api/v1/experiments', data);
  },
  startSimulation: async (id: string, payload: any = { global_seed: 42, duration_ticks: 10, tick_delay_seconds: 0.1 }) => {
    return await apiClient.post<any>(`/api/v1/runtime/experiments/${id}/start`, payload);
  },
  pauseSimulation: async (id: string) => {
    return await apiClient.post<any>(`/api/v1/runtime/experiments/${id}/pause`, {});
  },
  resumeSimulation: async (id: string) => {
    return await apiClient.post<any>(`/api/v1/runtime/experiments/${id}/resume`, {});
  },
  getPerformance: async (id: string) => {
    return await apiClient.get<any>(`/api/v1/experiments/${id}/performance`);
  }
};

export const dashboardApi = {
  getKpis: async () => {
    return await apiClient.get<any[]>('/api/v1/dashboard/kpis');
  },
  getSignals: async () => {
    return await apiClient.get<any[]>('/api/v1/dashboard/signals');
  },
  getSystemHealth: async () => {
    return await apiClient.get<any>('/api/v1/system/health');
  },
  getActiveSimulation: async () => {
    return await apiClient.get<any>('/api/v1/runtime/active');
  },
  getInsights: async () => {
    return await apiClient.get<any[]>('/api/v1/intelligence/insights');
  }
};
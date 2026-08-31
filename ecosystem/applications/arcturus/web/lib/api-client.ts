const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = {
  get: async <T>(endpoint: string): Promise<T> => {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  },

  post: async <T>(endpoint: string, data: any): Promise<T> => {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
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
};
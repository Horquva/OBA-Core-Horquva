const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = {
  get: async (endpoint: string) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Fetching from ${url}...`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  },
  post: async (endpoint: string, data: any) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Posting to ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  }
};

export const experimentApi = {
  listExperiments: () => apiClient.get('/experiments'),
  getExperiment: (id: string) => apiClient.get(`/experiments/${id}`),
  createExperiment: (data: any) => apiClient.post('/experiments', data),
};
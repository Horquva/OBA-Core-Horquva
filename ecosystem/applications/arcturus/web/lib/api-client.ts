const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = {
  get: async (endpoint: string) => {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return await response.json();
  },
  post: async (endpoint: string, data: any) => {
    const url = `${BASE_URL}${endpoint}`;
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
  // Existing Methods
  listExperiments: () => apiClient.get('/experiments'),
  getExperiment: (id: string) => apiClient.get(`/experiments/${id}`),
  createExperiment: (data: any) => apiClient.post('/experiments', data),
  
  // Day 4 & 5 Methods (Evidence, Validation, Intelligence)
  getEvidence: (experimentId: string) => apiClient.get(`/synthetic-data/${experimentId}`),
  getValidationResults: (experimentId: string) => apiClient.get(`/validation/${experimentId}`),
  getIntelligenceAssessments: (experimentId: string) => apiClient.get(`/intelligence/${experimentId}`)
};
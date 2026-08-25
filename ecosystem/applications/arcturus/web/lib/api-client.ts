const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Yeh generic API client hai jo fetch requests handle karega
export const apiClient = {
  get: async (endpoint: string) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Fetching from ${url}...`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },
  post: async (endpoint: string, data: any) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Posting to ${url}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};

// Yeh specifically Experiments ke liye API methods hain
export const experimentApi = {
  listExperiments: () => apiClient.get('/experiments'),
  getExperiment: (id: string) => apiClient.get(`/experiments/${id}`),
  createExperiment: (data: any) => apiClient.post('/experiments', data),
};
const BASE_URL = 'http://localhost:8000/api/v1';

export const apiClient = {
  get: async (endpoint: string) => {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Fetching from ${url}...`);
    // Real implementation will go here
    return { data: "API Client Ready" };
  }
};
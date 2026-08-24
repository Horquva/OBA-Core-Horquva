export const apiClient = {
  get: async (url: string) => {
    console.log(`Fetching from ${url}...`);
    // Implementation will connect to actual backend routes
    return { data: "API Client Ready" };
  }
};
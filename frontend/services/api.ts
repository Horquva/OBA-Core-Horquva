const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:8000';
};

export async function fetchApi<T>(endpoint: string): Promise<T> {
  const base = getBaseUrl();
  const res = await fetch(`${base}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`API Error (${res.status}): Failed to fetch ${endpoint}`);
  }

  return res.json();
}
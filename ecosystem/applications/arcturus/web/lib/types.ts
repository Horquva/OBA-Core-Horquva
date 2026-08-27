export interface User {
  id: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'suspended';
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}
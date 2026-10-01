import { vi } from 'vitest';

export const nav = {
  pathname: '/',
  search: '',
  params: {} as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
};

export function resetNav() {
  nav.pathname = '/';
  nav.search = '';
  nav.params = {};
  nav.push = vi.fn();
  nav.replace = vi.fn();
  nav.back = vi.fn();
}

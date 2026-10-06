import '@testing-library/jest-dom/vitest';
import * as axeMatchers from 'vitest-axe/matchers';
import 'vitest-axe/extend-expect';
import { cleanup } from '@testing-library/react';
import { afterEach, expect, vi } from 'vitest';
import { nav, resetNav } from './tests/mocks/navigation';

expect.extend(axeMatchers);

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  useParams: () => nav.params,
  useRouter: () => ({ push: nav.push, replace: nav.replace, back: nav.back, prefetch: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

afterEach(() => {
  cleanup();
  resetNav();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

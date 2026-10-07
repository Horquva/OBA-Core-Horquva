import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';

vi.mock('@/lib/navigation', () => ({ navigate: vi.fn(), replace: vi.fn() }));
import { navigate, replace } from '@/lib/navigation';
import SignInPage from '@/app/(bare)/sign-in/page';

type Options = { providers: string[]; devLogin: boolean };

const ALEX = { userId: 'user:admin', name: 'Alex', email: 'alex@acme.com', role: 'admin' };

function mockBackend(options: Options | 'down', { signedIn = false } = {}) {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (url.endsWith('/api/auth/session')) {
      return signedIn
        ? new Response(JSON.stringify(ALEX))
        : new Response('{"error":"Not signed in."}', { status: 401 });
    }
    if (url.endsWith('/api/auth/providers')) {
      if (options === 'down') throw new TypeError('Failed to fetch');
      return new Response(JSON.stringify(options));
    }
    if (url.endsWith('/api/auth/dev/sign-in')) return new Response(JSON.stringify(ALEX));
    return new Response('{}', { status: 404 });
  });
  return calls;
}

function visit(search: string) {
  window.history.pushState({}, '', `/sign-in${search}`);
}

describe('Sign-in page (Sprint 3 D13, SEC-01)', () => {
  beforeEach(() => {
    vi.mocked(navigate).mockClear();
    vi.mocked(replace).mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('offers only the providers the backend has configured', async () => {
    mockBackend({ providers: ['google'], devLogin: false });
    visit('');
    render(<SignInPage />);
    expect(await screen.findByRole('button', { name: /Continue with Google Workspace/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Microsoft Entra/ })).toBeNull();
  });

  it('starts the real SSO redirect and carries the return path', async () => {
    mockBackend({ providers: ['microsoft', 'google'], devLogin: false });
    visit('?returnTo=%2Fdepartures%2Fdep_1');
    render(<SignInPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Microsoft Entra/ }));
    expect(navigate).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\/microsoft\/start\?returnTo=%2Fdepartures%2Fdep_1$/)
    );
  });

  it('never forwards an off-site return path', async () => {
    mockBackend({ providers: ['google'], devLogin: false });
    visit('?returnTo=%2F%2Fevil.example.com');
    render(<SignInPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Google Workspace/ }));
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/google\/start\?returnTo=%2F$/));
  });

  it('explains callback errors in plain words', async () => {
    mockBackend({ providers: ['google'], devLogin: false });
    visit('?error=not_provisioned');
    render(<SignInPage />);
    expect(await screen.findByText(/no OBA account for that email/)).toBeInTheDocument();
  });

  it('falls back to a generic message for unknown error codes', async () => {
    mockBackend({ providers: ['google'], devLogin: false });
    visit('?error=something_new');
    render(<SignInPage />);
    expect(await screen.findByText('Sign-in did not complete. Please try again.')).toBeInTheDocument();
  });

  it('says so when no sign-in method is configured, instead of showing dead buttons', async () => {
    mockBackend({ providers: [], devLogin: false });
    visit('');
    render(<SignInPage />);
    expect(await screen.findByText(/No sign-in method is set up/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull();
  });

  it('shows a retryable error when the backend is unreachable', async () => {
    mockBackend('down');
    visit('');
    render(<SignInPage />);
    expect(await screen.findByText(/couldn't reach OBA/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('in local dev, signs in as a seeded role and returns to the page', async () => {
    const calls = mockBackend({ providers: [], devLogin: true });
    visit('?returnTo=%2Fpeople');
    render(<SignInPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'reviewer' }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/people'));
    expect(calls.find((c) => c.url.endsWith('/dev/sign-in'))?.body).toEqual({ email: 'chen@acme.com' });
  });

  it('sends an already signed-in user straight on', async () => {
    mockBackend({ providers: ['google'], devLogin: false }, { signedIn: true });
    visit('?returnTo=%2Factions');
    render(<SignInPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/actions'));
  });

  it('has no accessibility violations', async () => {
    mockBackend({ providers: ['microsoft', 'google'], devLogin: false });
    visit('?error=provider_denied');
    const { container } = render(<SignInPage />);
    await screen.findByRole('button', { name: /Microsoft Entra/ });
    expect(await axe(container)).toHaveNoViolations();
  });
});

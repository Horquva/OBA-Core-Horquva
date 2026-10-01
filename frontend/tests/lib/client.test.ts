import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/lib/api/client';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(impl as typeof fetch);
}

describe('request', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns parsed JSON and sends credentials', async () => {
    const spy = mockFetch(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    await expect(request<{ ok: number }>('/api/x')).resolves.toEqual({ ok: 1 });
    expect(spy.mock.calls[0][0]).toBe('http://localhost:4000/api/x');
    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('maps JSON errors to ApiError with the server message', async () => {
    mockFetch(async () => new Response(JSON.stringify({ error: 'Token expired' }), { status: 404 }));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, message: 'Token expired', notAvailable: false });
  });

  it('flags a missing backend route as notAvailable', async () => {
    mockFetch(async () => new Response('<pre>Cannot GET /api/x</pre>', { status: 404 }));
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 404, notAvailable: true });
  });

  it('maps network failure to status 0', async () => {
    mockFetch(async () => { throw new TypeError('Failed to fetch'); });
    const err = await request('/api/x').catch((e) => e);
    expect(err).toMatchObject({ status: 0, message: "We couldn't reach OBA." });
  });

  it('returns undefined for 204', async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    await expect(request('/api/x', { method: 'POST' })).resolves.toBeUndefined();
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/client';
import { useResource } from '@/lib/useResource';

describe('useResource', () => {
  it('goes loading -> ready', async () => {
    const { result } = renderHook(() => useResource('a', async () => 42));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', data: 42 }));
    expect(result.current.lastLoadedAt).not.toBeNull();
  });

  it('goes loading -> error with an ApiError', async () => {
    const { result } = renderHook(() => useResource('b', async () => { throw new ApiError(500, 'Boom'); }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') expect(result.current.error.message).toBe('Boom');
  });

  it('reload refetches', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const { result } = renderHook(() => useResource('c', fetcher));
    await waitFor(() => expect(result.current).toMatchObject({ data: 1 }));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current).toMatchObject({ data: 2 }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not fetch when key is null', () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => useResource(null, fetcher));
    expect(result.current.status).toBe('loading');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

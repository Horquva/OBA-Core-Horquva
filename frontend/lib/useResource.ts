'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, toApiError } from './api/client';

export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiError }
  | { status: 'ready'; data: T };

type Settled<T> = { id: string; ok: true; data: T } | { id: string; ok: false; error: ApiError };

export function useResource<T>(
  key: string | null,
  fetcher: () => Promise<T>,
): Resource<T> & { reload: () => void; lastLoadedAt: string | null } {
  const fetcherRef = useRef(fetcher);
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const id = key === null ? null : `${key}#${nonce}`;

  useEffect(() => {
    if (id === null) return;
    let live = true;
    fetcherRef.current().then(
      (data) => {
        if (!live) return;
        setSettled({ id, ok: true, data });
        setLastLoadedAt(new Date().toISOString());
      },
      (e) => {
        if (live) setSettled({ id, ok: false, error: toApiError(e) });
      },
    );
    return () => { live = false; };
  }, [id]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (id === null || !settled || settled.id !== id) return { status: 'loading', reload, lastLoadedAt };
  if (settled.ok) return { status: 'ready', data: settled.data, reload, lastLoadedAt };
  return { status: 'error', error: settled.error, reload, lastLoadedAt };
}

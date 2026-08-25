import React from 'react';

/**
 * AsyncState — implements the C.4 UI state model:
 *   Initial → Loading → Success (Empty | Populated) → Failure → Recovery
 * Ref: specs/03 (Network-Aware Behavior §8), Castor PDF Part C.4
 *
 * No consumer should branch on raw booleans (isLoading && !error && ...) —
 * this component is the single place that resolves state precedence, so every
 * screen renders a defined state instead of an undefined intersection of flags.
 *
 * Props:
 *   status: 'idle' | 'loading' | 'success' | 'empty' | 'error'
 *   error: Error | string | null — shown in the error state
 *   onRetry: () => void — required when status can be 'error' (Spec 03 §8: no silent failure)
 *   isEmpty: boolean — optional shortcut; if status='success' and isEmpty, renders empty state
 *   loadingFallback / emptyFallback / errorFallback: optional custom renderers
 *   children: rendered on 'success' (non-empty)
 */
export function AsyncState({
  status = 'idle',
  error = null,
  onRetry,
  isEmpty = false,
  loadingFallback,
  emptyFallback,
  errorFallback,
  children,
}) {
  if (status === 'loading') {
    return (
      loadingFallback ?? (
        <div className="async-state async-state--loading" role="status" aria-live="polite">
          <span className="async-state__spinner" aria-hidden="true" />
          <span>Loading…</span>
        </div>
      )
    );
  }

  if (status === 'error') {
    const message = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
    return (
      errorFallback ?? (
        <div className="async-state async-state--error" role="alert">
          <p>{message}</p>
          {onRetry && (
            <button type="button" className="async-state__retry" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )
    );
  }

  if (status === 'success' && isEmpty) {
    return (
      emptyFallback ?? (
        <div className="async-state async-state--empty">
          <p>Nothing here yet.</p>
        </div>
      )
    );
  }

  if (status === 'success') {
    return children;
  }

  // 'idle' — nothing has been requested yet
  return null;
}

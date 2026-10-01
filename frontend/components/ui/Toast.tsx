'use client';

import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'error' | 'success';
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = 'default' }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'pointer-events-auto p-4 rounded-control border border-rule bg-surface shadow-card flex items-start justify-between gap-3 text-sm transition-all',
              t.variant === 'error' && 'border-st-fail/30 text-st-fail',
              t.variant === 'success' && 'border-st-pass/30 text-st-pass',
              t.variant === 'default' && 'text-ink',
            )}
          >
            <div>
              <p className="font-medium text-ink">{t.title}</p>
              {t.description && <p className="text-xs text-ink-2 mt-0.5">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-3 hover:text-ink cursor-pointer focus:outline-none text-xs"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

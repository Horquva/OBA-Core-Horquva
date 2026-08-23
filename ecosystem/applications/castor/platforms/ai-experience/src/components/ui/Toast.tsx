"use client";

import { useEffect } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

interface ToastProps {
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, variant = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const variants = {
    success: `bg-[${tokens.component.badge.background.success.value}] border-[${tokens.color.semantic.success.value}] text-[${tokens.color.semantic.success.value}]`,
    error: `bg-[${tokens.component.badge.background.error.value}] border-[${tokens.color.semantic.error.value}] text-[${tokens.color.semantic.error.value}]`,
    warning: `bg-[${tokens.component.badge.background.warning.value}] border-[${tokens.color.semantic.warning.value}] text-[${tokens.color.semantic.warning.value}]`,
    info: `bg-[${tokens.component.badge.background.info.value}] border-[${tokens.color.primary[600].value}] text-[${tokens.color.primary[700].value}]`,
  };

  return (
    <div className={cn(`border-l-4 p-[${tokens.spacing.md.value}px] rounded shadow-md flex justify-between items-start`, variants[variant])}>
      <p className={`text-[${tokens.typography.bodySmall.size.value}px]`}>{message}</p>
      <button onClick={onClose} className={`ml-[${tokens.spacing.md.value}px] text-[${tokens.color.text.secondary.value}] hover:text-[${tokens.color.text.default.value}]`}>
        ✕
      </button>
    </div>
  );
}

export function Toaster({ toasts, removeToast }: { toasts: any[]; removeToast: (id: string) => void }) {
  return (
    <div className={`fixed bottom-[${tokens.spacing.md.value}px] right-[${tokens.spacing.md.value}px] z-50 flex flex-col gap-[${tokens.spacing.sm.value}px] max-w-sm w-full`}>
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}
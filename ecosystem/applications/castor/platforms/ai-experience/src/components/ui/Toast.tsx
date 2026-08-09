"use client";

import { cn } from "../../lib/utils";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, variant = "info", duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const variants = {
    success: "bg-green-50 border-green-500 text-green-800",
    error: "bg-red-50 border-red-500 text-red-800",
    warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
    info: "bg-blue-50 border-blue-500 text-blue-800",
  };

  return (
    <div className={cn("border-l-4 p-4 rounded shadow-md flex justify-between items-start", variants[variant])}>
      <p className="text-sm">{message}</p>
      <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600">✕</button>
    </div>
  );
}

export function Toaster({ toasts, removeToast }: { toasts: any[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <Toast key={toast.id} message={toast.message} variant={toast.variant} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}
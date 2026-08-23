"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
      modalRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={modalRef}
        className={cn(
          `relative z-50 w-full max-w-md 
          rounded-[${tokens.radius.lg.value}px] 
          bg-[${tokens.component.dialog.background.value}] 
          p-[${tokens.spacing.lg.value}px] 
          shadow-[${tokens.component.dialog.elevation.value}]`,
          className
        )}
        tabIndex={-1}
      >
        {title && (
          <h2 className={`text-[${tokens.typography.h3.size.value}px] font-[${tokens.typography.h3.weight.value}] mb-[${tokens.spacing.md.value}px]`}>
            {title}
          </h2>
        )}
        <div>{children}</div>
        <Button variant="secondary" className="mt-[${tokens.spacing.md.value}px]" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
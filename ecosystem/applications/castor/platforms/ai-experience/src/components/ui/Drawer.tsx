"use client";

import { ReactNode, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'right' | 'left' | 'bottom';
  children: ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, side = 'right', children, className }: DrawerProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sideClasses = {
    right: `inset-y-0 right-0 w-80 translate-x-0`,
    left: `inset-y-0 left-0 w-80 translate-x-0`,
    bottom: `inset-x-0 bottom-0 h-80 translate-y-0`,
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          `fixed transition-transform duration-[${tokens.motion.duration.default.value}ms] 
          ease-[${tokens.motion.easing.standard.value}] 
          bg-[${tokens.component.dialog.background.value}] 
          shadow-[${tokens.component.dialog.elevation.value}] 
          p-[${tokens.spacing.md.value}px]`,
          sideClasses[side],
          className
        )}
      >
        {children}
        <button
          onClick={onClose}
          className={`mt-[${tokens.spacing.md.value}px] text-[${tokens.typography.bodySmall.size.value}px] text-[${tokens.color.primary[600].value}]`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
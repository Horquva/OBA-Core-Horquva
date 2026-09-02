"use client";

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

interface DropdownProps { trigger: ReactNode; children: ReactNode; className?: string; }

export function Dropdown({ trigger, children, className }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            `absolute right-0 mt-[${tokens.spacing.sm.value}px] 
            w-48 rounded-[${tokens.radius.md.value}px] 
            bg-[${tokens.component.dialog.background.value}] 
            shadow-[${tokens.component.dialog.elevation.value}] 
            ring-1 ring-black/5 z-10 py-[${tokens.spacing.xs.value}px]`,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      className={cn(
        `block w-full text-left 
        px-[${tokens.spacing.md.value}px] py-[${tokens.spacing.sm.value}px] 
        text-[${tokens.typography.bodySmall.size.value}px] 
        text-[${tokens.color.text.default.value}] 
        hover:bg-[${tokens.color.neutral[50].value}] 
        transition-colors`,
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
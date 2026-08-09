"use client";

import { cn } from "../../lib/utils";
import { useState, useRef, useEffect, ReactNode } from "react";

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className={cn("absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg ring-1 ring-black/5 z-10 py-1", className)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      className={cn("block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors", className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
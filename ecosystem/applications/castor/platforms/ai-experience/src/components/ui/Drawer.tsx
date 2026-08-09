"use client";

import { cn } from "../../lib/utils";
import { ReactNode, useEffect } from "react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: "right" | "left" | "bottom";
  children: ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, side = "right", children, className }: DrawerProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sideClasses = {
    right: "inset-y-0 right-0 w-80 translate-x-0",
    left: "inset-y-0 left-0 w-80 translate-x-0",
    bottom: "inset-x-0 bottom-0 h-80 translate-y-0",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={cn("fixed transition-transform duration-300 ease-in-out bg-white shadow-lg p-4", sideClasses[side], className)}>
        {children}
        <button onClick={onClose} className="mt-4 text-sm text-blue-600">Close</button>
      </div>
    </div>
  );
}
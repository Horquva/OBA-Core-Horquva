'use client';

import * as React from 'react';
import { Drawer, DrawerProps } from './Drawer';
import { cn } from '@/lib/cn';

export interface SideSheetProps extends Omit<DrawerProps, 'className' | 'isOpen'> {
  isOpen?: boolean;
  open?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SideSheet({ isOpen, open, size = 'md', className, ...props }: SideSheetProps) {
  const sizeClasses = {
    sm: 'max-w-[400px]',
    md: 'max-w-[560px]',
    lg: 'max-w-[720px]',
  }[size];

  return <Drawer isOpen={isOpen ?? open ?? false} className={cn(sizeClasses, className)} {...props} />;
}

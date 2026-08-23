"use client";

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        className={cn(
          `flex h-10 w-full rounded-[${tokens.radius.md.value}px] 
          border border-[${tokens.component.input.border.default.value}] 
          bg-[${tokens.component.input.background.default.value}] 
          px-[${tokens.spacing.md.value}px] py-[${tokens.spacing.sm.value}px] 
          text-[${tokens.typography.body.size.value}px] 
          placeholder:text-[${tokens.component.input.text.placeholder.value}] 
          focus:outline-none focus:ring-2 focus:ring-[${tokens.component.input.border.focus.value}] focus:border-transparent 
          disabled:cursor-not-allowed disabled:opacity-50`,
          error && `border-[${tokens.component.input.border.error.value}] focus:ring-[${tokens.component.input.border.error.value}]`,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
export { Input };
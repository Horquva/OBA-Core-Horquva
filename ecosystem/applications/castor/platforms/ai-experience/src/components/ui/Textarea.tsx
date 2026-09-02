"use client";

import { forwardRef, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          `flex min-h-[80px] w-full rounded-[${tokens.radius.md.value}px] 
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
Textarea.displayName = 'Textarea';
export { Textarea };
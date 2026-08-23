"use client";

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center 
      font-medium transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
      disabled:opacity-50 disabled:pointer-events-none
      min-h-[44px] sm:min-h-[36px]
      cursor-pointer
    `;

    const variants = {
      primary: `
        bg-primary-600 text-on-primary 
        hover:bg-primary-700 
        focus-visible:ring-primary-400
        shadow-md shadow-primary-600/20
      `,
      secondary: `
        bg-neutral-100 text-neutral-700 
        hover:bg-neutral-200
        focus-visible:ring-neutral-400
      `,
      outline: `
        border border-neutral-300 bg-surface 
        hover:bg-neutral-50 hover:border-neutral-400
        focus-visible:ring-neutral-400
      `,
      danger: `
        bg-error text-on-primary 
        hover:bg-error/80
        focus-visible:ring-error
        shadow-md shadow-error/20
      `,
      ghost: `
        hover:bg-neutral-50 hover:text-neutral-900
        focus-visible:ring-neutral-400
      `,
      success: `
        bg-success text-on-primary 
        hover:bg-success/80
        focus-visible:ring-success
        shadow-md shadow-success/20
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 text-sm rounded-xl',
      lg: 'px-6 py-3 text-base rounded-xl',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
export { Button };
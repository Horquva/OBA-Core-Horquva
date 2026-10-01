import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    className,
    variant = 'secondary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    disabled,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-10 px-5 text-sm gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-ink text-surface hover:bg-ink-2 active:bg-ink-3 dark:bg-amber dark:text-ink-night dark:hover:bg-amber-ink border border-transparent shadow-xs',
    secondary:
      'bg-surface text-ink border border-rule hover:bg-surface-sunken hover:border-ink-3 active:bg-surface-sunken/80',
    ghost:
      'bg-transparent text-ink-2 hover:text-ink hover:bg-surface-sunken border border-transparent',
    destructive:
      'bg-rose-500/10 text-st-fail border border-st-fail/30 hover:bg-rose-500/20 active:bg-rose-500/25',
  }[variant];

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-control transition-colors duration-150 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-1',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        sizeClasses,
        variantClasses,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 shrink-0 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
    </button>
  );
});

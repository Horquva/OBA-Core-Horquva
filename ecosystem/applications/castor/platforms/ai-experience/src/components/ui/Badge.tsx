import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';
import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: `bg-[${tokens.color.neutral[100].value}] text-[${tokens.color.neutral[700].value}]`,
    success: `bg-[${tokens.component.badge.background.success.value}] text-[${tokens.color.semantic.success.value}]`,
    warning: `bg-[${tokens.component.badge.background.warning.value}] text-[${tokens.color.semantic.warning.value}]`,
    danger: `bg-[${tokens.component.badge.background.error.value}] text-[${tokens.color.semantic.error.value}]`,
    info: `bg-[${tokens.component.badge.background.info.value}] text-[${tokens.color.primary[700].value}]`,
  };

  return (
    <div
      className={cn(
        `inline-flex items-center rounded-[${tokens.radius.full.value}px] 
        px-[${tokens.spacing.sm.value}px] py-[${tokens.spacing.xs.value}px] 
        text-[${tokens.typography.caption.size.value}px] font-medium`,
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
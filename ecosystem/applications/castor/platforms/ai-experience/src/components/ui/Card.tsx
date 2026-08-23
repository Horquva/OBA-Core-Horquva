import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        `rounded-[${tokens.radius.lg.value}px] 
        border border-[${tokens.color.border.default.value}] 
        bg-[${tokens.component.card.background.value}] 
        text-[${tokens.color.text.default.value}] 
        shadow-[${tokens.component.card.elevation.default.value}]`,
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        `flex flex-col space-y-[${tokens.spacing.xs.value}px] 
        px-[${tokens.spacing.lg.value}px] pt-[${tokens.spacing.lg.value}px]`,
        className
      )}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        `text-[${tokens.typography.h2.size.value}px] 
        font-[${tokens.typography.h2.weight.value}] 
        leading-[${tokens.typography.h2.lineHeight.value}px] 
        tracking-tight`,
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        `text-[${tokens.typography.bodySmall.size.value}px] 
        text-[${tokens.color.text.secondary.value}]`,
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        `px-[${tokens.spacing.lg.value}px] pb-[${tokens.spacing.lg.value}px] pt-0`,
        className
      )}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        `flex items-center px-[${tokens.spacing.lg.value}px] pb-[${tokens.spacing.lg.value}px] pt-0`,
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
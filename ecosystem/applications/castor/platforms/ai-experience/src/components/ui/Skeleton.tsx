import { cn } from '../../lib/utils';
import { tokens } from '../../lib/tokens';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        `animate-pulse rounded-[${tokens.radius.md.value}px] bg-[${tokens.component.card.skeleton.value}]`,
        className
      )}
      {...props}
    />
  );
}
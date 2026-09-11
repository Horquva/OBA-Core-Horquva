import clsx from 'clsx';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  className?: string;
  variant?: 'pill' | 'square';
}

export function RiskBadge({ level, className, variant = 'square' }: RiskBadgeProps) {
  const isPill = variant === 'pill';
  return (
    <div className={clsx(
      "inline-flex font-bold uppercase tracking-widest border",
      isPill ? "px-3 py-1 rounded-full text-xs" : "px-3 py-1 rounded-md text-[10px]",
      level === 'critical' && 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
      level === 'high'     && 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      // 'normal' is Dependency['type']'s rank-equivalent of 'medium' (see
      // lib/criticality.ts's RISK_RANK / D-65) -- this prop already loosely
      // accepts either vocabulary, so it must style both, not just one.
      (level === 'medium' || level === 'normal') && 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      level === 'low'      && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      // F-11: neutral, not a color on the low->critical scale -- 'unknown'
      // means nobody scored this, which is not the same claim as 'low'.
      level === 'unknown'  && 'bg-[var(--border-subtle)] text-[color:var(--text-tertiary)] border-[var(--border-default)]',
      className
    )}>
      {level}
    </div>
  );
}

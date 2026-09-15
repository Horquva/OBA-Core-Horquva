import { PenLine } from 'lucide-react';
import clsx from 'clsx';

interface AuthoredBadgeProps {
  authored: boolean | undefined;
  className?: string;
}

// F-9: mirrors ProvenanceBadge's "Historical — not live" treatment for the
// backend's other honesty flag. `authored: true` (backend/brain/knowledge/
// intelligenceExchange.js's createIntelligence()) means this module's
// headline number is built from invented weights or thresholds -- M45's
// benchmark targets, M03/M18's severity weights, M43's blend weights --
// rather than a measured structural fact. Nothing here claims the number is
// wrong, only that it is a judgment call, not a measurement, exactly the
// distinction derived.js's pillars already draw with definitionsAreAuthored.
export function AuthoredBadge({ authored, className }: AuthoredBadgeProps) {
  if (!authored) return null;

  return (
    <div
      title="Built from authored weights/thresholds, not a measured value alone — see the module's own definition"
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
        'bg-[var(--bg-surface)] text-[color:var(--text-tertiary)] border-[var(--border-default)]',
        className,
      )}
    >
      <PenLine className="w-3 h-3" />
      Authored
    </div>
  );
}

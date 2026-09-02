import { Clock } from 'lucide-react';
import clsx from 'clsx';

interface Provenance {
  source: string;
  table: string;
}

interface ProvenanceBadgeProps {
  provenance: Provenance;
  className?: string;
}

// The backend already tags historical-only responses with
// `provenance: { source: 'historical', table: ... }` (D-09's KEEP list —
// tables like organizational_forecasts are a genuine, never-rewritten time
// series that can't be recomputed live), but nothing in the UI surfaced it,
// so pages built on that data read as live without saying so. This makes the
// distinction visible wherever a page renders provenance-tagged data.
export function ProvenanceBadge({ provenance, className }: ProvenanceBadgeProps) {
  if (provenance.source !== 'historical') return null;

  return (
    <div
      title={`Static historical data from "${provenance.table}" — not recomputed live`}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border',
        'bg-[var(--bg-surface)] text-[color:var(--text-tertiary)] border-[var(--border-default)]',
        className,
      )}
    >
      <Clock className="w-3 h-3" />
      Historical — not live
    </div>
  );
}

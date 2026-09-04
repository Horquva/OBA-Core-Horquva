import clsx from 'clsx';

export interface EvidenceInfo {
  status: string;
  coverage: number;
  covered: number;
  total: number;
}

interface EvidenceBadgeProps {
  evidence: EvidenceInfo | null | undefined;
  className?: string;
}

/**
 * Renders in place of a score/rating when a backend evidence gate reports
 * insufficient_evidence — a neutral "we don't know yet" state, distinct from
 * every risk-tier color RiskBadge uses, so it never reads as a verdict.
 */
export function EvidenceBadge({ evidence, className }: EvidenceBadgeProps) {
  if (!evidence || evidence.status !== 'insufficient_evidence') return null;

  const pct = Math.round((evidence.coverage ?? 0) * 100);

  return (
    <div
      className={clsx(
        'inline-flex flex-col gap-0.5 px-3 py-1.5 rounded-md border',
        'bg-[color:var(--bg-elevated)] border-[color:var(--border-default)]',
        className,
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
        Insufficient evidence
      </span>
      <span className="text-xs text-[color:var(--text-secondary)]">
        {evidence.covered} of {evidence.total} tracked — {pct}%
      </span>
    </div>
  );
}

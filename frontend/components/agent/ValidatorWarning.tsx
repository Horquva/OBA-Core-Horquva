'use client';

interface ValidatorWarningProps {
  status: 'clean' | 'repaired' | 'flagged' | undefined;
}

export function ValidatorWarning({ status }: ValidatorWarningProps) {
  if (status !== 'flagged') {
    return null;
  }

  return (
    <div className="mt-2 rounded-lg border border-[var(--risk-critical-border)] bg-[var(--risk-critical-bg)] px-3 py-2 text-[13px] text-[var(--risk-critical-text)]">
      ⚠️ This answer may contain unverified figures.
    </div>
  );
}

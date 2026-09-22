'use client';

interface ValidatorWarningProps {
  status: 'clean' | 'repaired' | 'flagged' | undefined;
}

export function ValidatorWarning({ status }: ValidatorWarningProps) {
  if (status !== 'flagged') {
    return null;
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        color: 'rgb(239, 68, 68)',
        fontSize: '13px',
        marginTop: '8px',
      }}
    >
      ⚠️ This answer may contain unverified figures.
    </div>
  );
}

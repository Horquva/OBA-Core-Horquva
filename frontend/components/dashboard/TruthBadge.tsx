import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface TruthBadgeProps {
  confidence?: number | null; // 0-100
  /**
   * No default on purpose. This used to default to `true`, so a caller that
   * forgot to pass anything silently showed "Verified" -- the exact
   * "absence rendered as a confident verdict" pattern D-07 exists to catch
   * everywhere else in this codebase. A caller must now say what it means:
   * pass `confidence` when a real number exists, or `verified` explicitly
   * when there's a real boolean signal (e.g. non-empty live data). Omitting
   * both renders honestly as Unverified.
   */
  verified?: boolean;
  label?: string;
}

export function TruthBadge({ confidence, verified, label }: TruthBadgeProps) {
  const isVerified = confidence != null ? confidence > 0 : Boolean(verified);

  if (!isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
        style={{
          background: 'rgba(234 88 12 / 0.10)',
          color: '#fb923c',
          border: '1px solid rgba(234 88 12 / 0.22)'
        }}>
        <ShieldAlert className="w-2.5 h-2.5" />
        Unverified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{
        background: 'rgba(99 102 241 / 0.12)',
        color: '#818cf8',
        border: '1px solid rgba(99 102 241 / 0.28)'
      }}>
      <ShieldCheck className="w-2.5 h-2.5" />
      {label ?? 'Verified'}{confidence != null ? ` · ${confidence}%` : ''}
    </span>
  );
}

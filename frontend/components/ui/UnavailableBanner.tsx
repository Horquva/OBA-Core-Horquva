import { AlertTriangle } from 'lucide-react';

interface UnavailableBannerProps {
  /** What failed to load, in the reader's terms — e.g. "Predictive risk scores". */
  label: string;
}

/**
 * F-12: a secondary data source failing to load used to degrade silently —
 * the page kept rendering, but every consumer's own fallback (an empty map,
 * `?? 'low'`, a zeroed score) then looked identical to a genuinely healthy
 * organization. The soft-fallback itself is the right call (the page's core
 * dataset still failing hard is what actually matters — see ownership/page.tsx
 * and knowledge/page.tsx's own comments on that split); what was missing is
 * telling the reader the fallback fired at all. This is that one banner,
 * shared rather than re-authored per page since every use of it says the
 * same thing about a different source.
 */
export function UnavailableBanner({ label }: UnavailableBannerProps) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-sm text-amber-400">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{label} could not be loaded — figures on this page that depend on it may read lower or emptier than reality until it recovers.</span>
    </div>
  );
}

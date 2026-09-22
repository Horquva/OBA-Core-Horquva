"use client";

import { useRouter } from "next/navigation";
import { goToTarget } from "../../lib/navigate";

// Matches propose-navigation.js's tool result data shape exactly -- a whole
// page route, not a page+section pair. The backend tool has no concept of a
// section anchor, only a page slug.
interface NavigationOfferData {
  slug: string;
  route: string;
  label: string;
  reason: string | null;
}

export function NavigationOffer({
  navigationOffer,
}: {
  navigationOffer: NavigationOfferData | null;
}) {
  const router = useRouter();

  if (!navigationOffer) return null;

  return (
    <button
      onClick={() =>
        goToTarget({
          page: navigationOffer.route,
          match: undefined,
          router,
        })
      }
      className="mt-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
    >
      {navigationOffer.label} →
    </button>
  );
}

export default NavigationOffer;
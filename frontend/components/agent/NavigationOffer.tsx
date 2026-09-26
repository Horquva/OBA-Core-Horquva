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

// One answer can point to several dashboard pages (loop.js's
// navigationOffersFrom collects every propose_navigation call in the turn,
// deduped by slug) -- render one button per offer instead of only ever
// showing the last page the model happened to call.
export function NavigationOffer({
  navigationOffers,
}: {
  navigationOffers: NavigationOfferData[];
}) {
  const router = useRouter();

  if (!navigationOffers || navigationOffers.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {navigationOffers.map((offer) => (
        <button
          key={offer.slug}
          onClick={() =>
            goToTarget({
              page: offer.route,
              match: undefined,
              router,
            })
          }
          title={offer.reason ?? undefined}
          className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] hover:border-[var(--accent-border)]"
        >
          {offer.label} →
        </button>
      ))}
    </div>
  );
}

export default NavigationOffer;
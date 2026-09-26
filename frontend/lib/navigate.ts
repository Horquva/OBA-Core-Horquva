// frontend/lib/navigate.ts

import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { requestFocus } from '@/lib/focusTarget';

/**
 * Single source of truth for navigation with focus highlighting
 * 
 * This function handles:
 * 1. Same-route navigation → history.replaceState (no page reload)
 * 2. Cross-route navigation → router.push (page change)
 * 3. Focus highlighting → ?focus=section query parameter
 * 
 * @param page - The page URL (e.g., '/dashboard', '/risk')
 * @param match - The section ID to highlight (e.g., 'workflow-123')
 * @param router - Next.js router instance (for cross-route navigation)
 * 
 * @example
 * const router = useRouter();
 * goToTarget({ page: '/risk', match: 'workflow-123', router })
 */
export function goToTarget({
  page,
  match,
  router,
}: {
  page: string;
  match: string | undefined;
  router: AppRouterInstance;
}): void {
  // Build the URL with focus parameter if match exists
  const href = match
    ? `${page}?focus=${encodeURIComponent(match)}`
    : page;

  // SAME ROUTE: Use history.replaceState to avoid page reload
  if (page === window.location.pathname) {
    window.history.replaceState(null, '', href);
    if (match) {
      requestFocus(match);
    }
    return;
  }

  // DIFFERENT ROUTE: Use Next.js router
  router.push(href);
  // The focus engine retries until the destination's data has landed.
  if (match) {
    requestFocus(match);
  }
}
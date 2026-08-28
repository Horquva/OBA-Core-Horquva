'use client';

/**
 * Makes `?focus=<block name>` work as a shareable deep link, so an executive can
 * paste "/risk?focus=Critical%20Risk%20Agents" into a message and the recipient
 * lands on that exact block. In-app navigation already calls requestFocus
 * directly; this covers cold loads and browser back/forward.
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { requestFocus } from '@/lib/focusTarget';

export default function DeepLinkFocus() {
  const pathname = usePathname();

  useEffect(() => {
    const focus = new URLSearchParams(window.location.search).get('focus');
    // No cleanup on purpose: an in-app jump calls requestFocus *before* the
    // route changes, and cancelling here would kill the very request that
    // triggered this navigation. requestFocus already clears its own timer.
    if (focus) requestFocus(focus);
  }, [pathname]);

  return null;
}

import React, { useEffect, useRef } from 'react';
import { useSwipeGesture } from './useSwipeGesture';
import { useFocusTrap } from './useFocusTrap';
import { useOverlayBackStack } from './useOverlayBackStack';
import './navigation.css';

/**
 * SideDrawer — collapsible navigation drawer for tablet (overlay) and desktop (persistent).
 * Ref: specs/02-adaptive-navigation-spec.md §3.2
 *
 * Props:
 *   mode: 'overlay' | 'persistent'  — tablet uses 'overlay', desktop uses 'persistent'
 *   open: boolean
 *   onClose: () => void
 *   children: nav content
 */
export function SideDrawer({ mode = 'overlay', open, onClose, children }) {
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);

  const { handlers } = useSwipeGesture({
    axis: 'horizontal',
    onDismiss: () => mode === 'overlay' && onClose?.(),
  });

  // Spec 02 §5: back closes an open overlay drawer before it navigates the
  // route stack back. Only borrows a history entry in overlay mode — the
  // persistent desktop drawer is not a navigable overlay and must not
  // consume back (Spec 02 §3.2: "does not trap focus when persistent").
  useOverlayBackStack(mode === 'overlay' && open, onClose);

  // Focus trap + restore-on-close, only relevant in overlay mode (Spec 02 §3.2, §4)
  useFocusTrap(drawerRef, mode === 'overlay' && open);
  useEffect(() => {
    if (mode !== 'overlay') return;
    if (open) {
      triggerRef.current = document.activeElement;
      drawerRef.current?.focus();

      const onKeyDown = (e) => {
        if (e.key === 'Escape') onClose?.();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        // restore focus to whatever opened the drawer
        if (triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus();
        }
      };
    }
    return undefined;
  }, [open, mode, onClose]);

  if (mode === 'persistent') {
    // Desktop: always in the DOM, collapses width rather than unmounting
    return (
      <aside
        className={`cx-drawer cx-drawer--persistent${open ? '' : ' cx-drawer--collapsed'} cx-safe-left`}
        aria-label="Primary navigation"
      >
        {children}
      </aside>
    );
  }

  // Tablet: overlay mode
  if (!open) return null;

  return (
    <>
      <div className="cx-drawer__scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={drawerRef}
        className="cx-drawer cx-drawer--overlay cx-safe-left"
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        tabIndex={-1}
        {...handlers}
      >
        {children}
      </div>
    </>
  );
}

export default SideDrawer;

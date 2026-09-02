import React, { useEffect, useRef } from 'react';
import { useBreakpoint } from '../layout/useBreakpoint';
import { useSwipeGesture } from './useSwipeGesture';
import { useFocusTrap } from './useFocusTrap';
import { useOverlayBackStack } from './useOverlayBackStack';
import './navigation.css';

/**
 * ModalSheet — adaptive modal: bottom sheet on mobile (swipe-to-dismiss + drag handle),
 * centered dialog on tablet/desktop. Same component, different presentation by breakpoint.
 * Ref: specs/02-adaptive-navigation-spec.md §3.3
 *
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   dismissible: boolean (default true) — false for destructive-confirmation flows (Spec §3.3)
 *   title: string
 *   children: content
 */
export function ModalSheet({ open, onClose, dismissible = true, title, children }) {
  const { isMobile } = useBreakpoint();
  const sheetRef = useRef(null);
  const triggerRef = useRef(null);

  const { handlers } = useSwipeGesture({
    axis: 'vertical',
    onDismiss: () => dismissible && onClose?.(),
  });

  // Spec 02 §5: mobile hardware/browser back closes the sheet before it
  // navigates the underlying route stack back. Applies regardless of
  // dismissible — a non-dismissible confirmation still shouldn't let back
  // silently skip past it, but the overlay is a UI-state borrow only (see
  // useOverlayBackStack) and never mutates the sheet's own dismissible gate.
  useOverlayBackStack(open, () => dismissible && onClose?.());

  // Spec 04 §5: Tab/Shift+Tab must not escape the sheet to background content
  // while it's open.
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      sheetRef.current?.focus();
      const onKeyDown = (e) => {
        if (e.key === 'Escape' && dismissible) onClose?.();
      };
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        if (triggerRef.current instanceof HTMLElement) {
          triggerRef.current.focus();
        }
      };
    }
    return undefined;
  }, [open, dismissible, onClose]);

  if (!open) return null;

  const presentation = isMobile ? 'cx-sheet--bottom' : 'cx-sheet--centered';

  return (
    <>
      <div
        className="cx-drawer__scrim"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className={`cx-sheet ${presentation} cx-safe-bottom`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        {...(isMobile ? handlers : {})}
      >
        {isMobile && <div className="cx-sheet__drag-handle" aria-hidden="true" />}
        {title && <h2 className="cx-sheet__title">{title}</h2>}
        <div className="cx-sheet__content">{children}</div>
      </div>
    </>
  );
}

export default ModalSheet;

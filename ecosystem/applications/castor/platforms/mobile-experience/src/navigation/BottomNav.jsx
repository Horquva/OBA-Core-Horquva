import React, { useState } from 'react';
import { ModalSheet } from './ModalSheet';
import './navigation.css';

/**
 * BottomNav — touch-optimized bottom navigation bar for mobile (xs/sm breakpoints).
 * Ref: specs/02-adaptive-navigation-spec.md §3.1
 *
 * Contract:
 *  - Max 5 items rendered. Overflow items (6th+) are NOT truncated — they are
 *    grouped behind a "More" item that opens a ModalSheet listing the rest,
 *    per spec: "overflow items go into a 'More' sheet, never truncated silently."
 *  - Active state indicated by aria-current + visual state (never color alone).
 *  - Touch targets are >= 44x44px via CSS (Spec 03 §2).
 *
 * Props:
 *   items: [{ key, label, icon: ReactNode, activeIcon?: ReactNode, href }]
 *   activeKey: string — current active item key (derived from route state, not local state)
 *   onNavigate: (key) => void
 */
const VISIBLE_LIMIT = 5;

export function BottomNav({ items = [], activeKey, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasOverflow = items.length > VISIBLE_LIMIT;
  // Reserve one slot for "More" when there's overflow, so total rendered
  // items (visible + More) never exceeds VISIBLE_LIMIT.
  const primaryCount = hasOverflow ? VISIBLE_LIMIT - 1 : VISIBLE_LIMIT;
  const visibleItems = items.slice(0, primaryCount);
  const overflowItems = hasOverflow ? items.slice(primaryCount) : [];
  const activeIsOverflow = hasOverflow && overflowItems.some((i) => i.key === activeKey);

  const handleOverflowSelect = (key) => {
    setMoreOpen(false);
    onNavigate?.(key);
  };

  return (
    <>
      <nav className="cx-bottom-nav cx-safe-bottom" role="navigation" aria-label="Primary">
        {visibleItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              className={`cx-bottom-nav__item${isActive ? ' cx-bottom-nav__item--active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onNavigate?.(item.key)}
            >
              <span className="cx-bottom-nav__icon">
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </span>
              <span className="cx-bottom-nav__label">{item.label}</span>
            </button>
          );
        })}

        {hasOverflow && (
          <button
            type="button"
            className={`cx-bottom-nav__item${activeIsOverflow ? ' cx-bottom-nav__item--active' : ''}`}
            aria-current={activeIsOverflow ? 'page' : undefined}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <span className="cx-bottom-nav__icon" aria-hidden="true">
              •••
            </span>
            <span className="cx-bottom-nav__label">More</span>
          </button>
        )}
      </nav>

      {hasOverflow && (
        <ModalSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <ul className="cx-bottom-nav__more-list">
            {overflowItems.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  className={`cx-bottom-nav__more-item${
                    item.key === activeKey ? ' cx-bottom-nav__more-item--active' : ''
                  }`}
                  aria-current={item.key === activeKey ? 'page' : undefined}
                  onClick={() => handleOverflowSelect(item.key)}
                >
                  <span className="cx-bottom-nav__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </ModalSheet>
      )}
    </>
  );
}

export default BottomNav;

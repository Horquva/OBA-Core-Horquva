import React, { useCallback, useState } from 'react';
import { Container } from './layout/Container';
import { Grid } from './layout/Grid';
import { AsyncState } from './layout/AsyncState';
import { useBreakpoint } from './layout/useBreakpoint';
import { BottomNav } from './navigation/BottomNav';
import { SideDrawer } from './navigation/SideDrawer';
import { ModalSheet } from './navigation/ModalSheet';
import { useRouteNav } from './navigation/useRouteNav';
import { usePullToRefresh } from './navigation/usePullToRefresh';
import './layout/safe-area.css';

const NAV_ITEMS = [
  { key: 'home', label: 'Home' },
  { key: 'search', label: 'Search' },
  { key: 'saved', label: 'Saved' },
  { key: 'profile', label: 'Profile' },
];

const NAV_KEYS = NAV_ITEMS.map((i) => i.key);

/**
 * HomeFeed — demonstrates the pull-to-refresh gesture (Phase 4) driving the
 * AsyncState lifecycle (Phase 7: Initial → Loading → Success/Empty → Failure
 * → Recovery). scrollRef is the same scrollable element the pull gesture
 * arms against, per usePullToRefresh's "must not trigger during normal
 * scrolling" contract (only arms when that element's scrollTop is 0).
 */
function HomeFeed({ scrollRef }) {
  const [status, setStatus] = useState('success');
  const [items, setItems] = useState(['Update 1', 'Update 2', 'Update 3']);

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      // Reference build has no live backend; simulate a network round trip
      // so the gesture → loading → success lifecycle is exercised for real.
      await new Promise((resolve) => setTimeout(resolve, 400));
      setItems((prev) => [`Update ${prev.length + 1}`, ...prev]);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, []);

  const { handlers, status: pullStatus, pullDistance } = usePullToRefresh({
    onRefresh: refresh,
    scrollContainerRef: scrollRef,
  });

  return (
    <div {...handlers}>
      {pullStatus !== 'idle' && (
        <div
          className="cx-pull-indicator"
          style={{ height: pullDistance, textAlign: 'center', fontSize: 12, color: '#6b6b6b' }}
          aria-hidden="true"
        >
          {pullStatus === 'refreshing' ? 'Refreshing…' : pullStatus === 'ready' ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}
      <AsyncState status={status} isEmpty={items.length === 0} onRetry={refresh}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item} style={{ padding: '12px 0', borderBottom: '1px solid #e2e2e2' }}>
              {item}
            </li>
          ))}
        </ul>
      </AsyncState>
    </div>
  );
}

export default function App() {
  const { breakpoint, isMobile, isDesktop } = useBreakpoint();
  // Route state is the single source of truth for active navigation
  // (Spec 02 §4) — active tab, deep-link restoration, and back-stack all
  // derive from useRouteNav rather than local-only component state.
  const { active, navigate, containerRef } = useRouteNav(NAV_KEYS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Container>
      <h1>Castor demo</h1>
      <p>
        Current breakpoint: <strong>{breakpoint}</strong> ({isMobile ? 'mobile' : isDesktop ? 'desktop' : 'tablet'})
      </p>

      <button onClick={() => setDrawerOpen(true)}>Open side drawer</button>{' '}
      <button onClick={() => setSheetOpen(true)}>Open modal sheet</button>

      <div
        ref={containerRef}
        style={{ marginTop: 24, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
      >
        {active === 'home' ? (
          <HomeFeed scrollRef={containerRef} />
        ) : (
          <Grid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap="md">
            {['Card 1', 'Card 2', 'Card 3', 'Card 4'].map((c) => (
              <div key={c} style={{ background: '#eee', padding: 16, borderRadius: 8 }}>
                {active}: {c}
              </div>
            ))}
          </Grid>
        )}
      </div>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <p>Side drawer content</p>
      </SideDrawer>

      <ModalSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <p>Modal sheet content</p>
      </ModalSheet>

      {isMobile && (
        <BottomNav items={NAV_ITEMS} activeKey={active} onNavigate={navigate} />
      )}
    </Container>
  );
}

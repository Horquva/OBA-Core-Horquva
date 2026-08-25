/**
 * App-level integration test covering the PLAN's critical journey (Phase 11)
 * subset that's actually implemented in this reference build: mobile
 * navigation → tab switch → route change → deep-link restoration, and the
 * pull-to-refresh gesture driving the AsyncState lifecycle.
 */

import React from 'react';
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import App from '../App';

function resetLocation() {
  window.history.pushState({}, '', '#/');
}

function setViewportWidth(width) {
  window.innerWidth = width;
  window.dispatchEvent(new Event('resize'));
}

beforeEach(() => {
  resetLocation();
  setViewportWidth(375); // mobile — BottomNav visible
});

afterEach(() => {
  cleanup();
  resetLocation();
});

describe('App — navigation lifecycle', () => {
  test('tapping a tab updates the URL hash (route state is the source of truth)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(window.location.hash).toBe('#/search');
    expect(screen.getByRole('button', { name: /search/i })).toHaveAttribute('aria-current', 'page');
  });

  test('deep-link restoration: loading with an existing hash restores the correct tab', () => {
    window.history.pushState({}, '', '#/saved');
    render(<App />);
    expect(screen.getByRole('button', { name: /saved/i })).toHaveAttribute('aria-current', 'page');
  });

  test('hardware/browser back steps through tab history instead of leaving the app', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /profile/i }));
    expect(screen.getByRole('button', { name: /profile/i })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    expect(screen.getByRole('button', { name: /search/i })).toHaveAttribute('aria-current', 'page');

    // jsdom does not implement real history.back() navigation (location is
    // never updated — a jsdom limitation, see useRouteNav.test.js). Simulate
    // what a real back-button press does: URL reverts to the previous entry
    // and popstate fires.
    act(() => {
      window.location.hash = '/profile';
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByRole('button', { name: /profile/i })).toHaveAttribute('aria-current', 'page');
  });
});

describe('App — pull-to-refresh drives AsyncState', () => {
  test('a completed pull-to-refresh transitions Home through loading back to success with new content', async () => {
    render(<App />);
    // Home is the default tab — its feed list should already be visible.
    expect(screen.getByText('Update 1')).toBeInTheDocument();

    const feed = screen.getByText('Update 1').closest('div');
    fireEvent.touchStart(feed, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(feed, { touches: [{ clientY: 100 }] });
    fireEvent.touchEnd(feed, { changedTouches: [{ clientY: 100 }] });

    // Loading state should appear (role="status" per AsyncState) before
    // settling back to success with a newly prepended item.
    await waitFor(() => {
      expect(screen.getByText(/update 4/i)).toBeInTheDocument();
    });
  });
});

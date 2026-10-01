import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY, applyThemePreference, readThemePreference, setThemePreference, themeInitScript, useThemePreference,
} from '@/lib/theme';

describe('theme preference', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readThemePreference()).toBe('system');
  });

  it('applies data-theme for light and dark, and removes it for system', () => {
    applyThemePreference('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyThemePreference('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    applyThemePreference('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists and notifies subscribers', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current[0]).toBe('system');
    act(() => setThemePreference('dark'));
    expect(result.current[0]).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('ignores garbage in storage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readThemePreference()).toBe('system');
  });

  it('init script applies a stored preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    new Function(themeInitScript)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});

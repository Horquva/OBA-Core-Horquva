'use client';

import { useSyncExternalStore } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export const THEME_STORAGE_KEY = 'oba-theme';

const listeners = new Set<() => void>();

function isPreference(v: unknown): v is ThemePreference {
  return v === 'light' || v === 'dark' || v === 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyThemePreference(p: ThemePreference): void {
  const root = document.documentElement;
  if (p === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', p);
}

export function setThemePreference(p: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, p);
  } catch {
    /* storage unavailable: still apply for this page view */
  }
  applyThemePreference(p);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useThemePreference(): [ThemePreference, (p: ThemePreference) => void] {
  const pref = useSyncExternalStore(subscribe, readThemePreference, () => 'system' as ThemePreference);
  return [pref, setThemePreference];
}

export const themeInitScript = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p==='light'||p==='dark'){document.documentElement.setAttribute('data-theme',p);}}catch(e){}})();`;

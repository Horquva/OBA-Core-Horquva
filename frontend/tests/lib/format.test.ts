import { describe, expect, it } from 'vitest';
import {
  firstName, formatDate, formatNumber, formatRelative, formatTime, greeting, plural,
} from '@/lib/format';
import { cn } from '@/lib/cn';

describe('format', () => {
  it('formats numbers per locale', () => {
    expect(formatNumber(1200, 'en-US')).toBe('1,200');
    expect(formatNumber(1200, 'de-DE')).toBe('1.200');
  });

  it('formats dates and times per locale', () => {
    expect(formatDate('2026-10-14T09:00:00Z', 'en-US')).toMatch(/Oct 14, 2026/);
    expect(formatTime('2026-10-14T08:42:00Z', 'en-US')).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats relative time', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(formatRelative('2026-10-01T10:00:00Z', now, 'en-US')).toBe('2 hours ago');
    expect(formatRelative('2026-09-30T12:00:00Z', now, 'en-US')).toBe('yesterday');
    expect(formatRelative('2026-10-15T12:00:00Z', now, 'en-US')).toBe('in 2 weeks');
  });

  it('picks the greeting by local hour', () => {
    expect(greeting(new Date(2026, 9, 1, 8))).toBe('Good morning');
    expect(greeting(new Date(2026, 9, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 9, 1, 21))).toBe('Good evening');
    expect(greeting(new Date(2026, 9, 1, 3))).toBe('Good evening');
  });

  it('extracts first names and pluralises', () => {
    expect(firstName('Guido van Rossum')).toBe('Guido');
    expect(firstName('  ')).toBe('');
    expect(plural(1, 'person', 'people')).toBe('1 person');
    expect(plural(3, 'person', 'people')).toBe('3 people');
  });

  it('merges classes with tailwind-merge', () => {
    expect(cn('px-2', false, 'px-4')).toBe('px-4');
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const cssPath = path.resolve(process.cwd(), 'app/globals.css');
const css = readFileSync(cssPath, 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector + ' {');
  if (start < 0) throw new Error(`missing block ${selector}`);
  const body = css.slice(start + selector.length + 2, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]] = m[2].toUpperCase();
  return out;
}

function lum(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const light = block(':root');
const dark = block(':root[data-theme="dark"]');
const darkMedia = block(':root:not([data-theme="light"])');

const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'canvas'], ['ink-2', 'canvas'], ['ink-3', 'canvas'], ['ink-3', 'surface'], ['ink-3', 'surface-sunken'],
  ['ink', 'surface'], ['amber-ink', 'surface'], ['on-amber', 'amber'],
  ['ev-stated', 'surface'], ['ev-inferred', 'surface'], ['ev-confirmed', 'surface'], ['ev-unknown', 'surface'],
  ['st-pass', 'surface'], ['st-fail', 'surface'], ['st-unknown', 'surface'], ['st-fail', 'canvas'],
];

describe('design tokens', () => {
  it('matches the spec values for brand tokens', () => {
    expect(light).toMatchObject({
      canvas: '#F3EFE7', surface: '#FFFFFF', 'surface-sunken': '#EBE5DA', ink: '#15120F', 'ink-2': '#4A433C',
      'ink-3': '#6E655C', rule: '#DAD2C4', bronze: '#A9825A', amber: '#E8870F', 'amber-ink': '#A85A00',
      'ev-stated': '#1D5FA8', 'ev-inferred': '#A85A00', 'ev-confirmed': '#2F6B2A', 'ev-unknown': '#6B6560',
      'st-pass': '#2F6B2A', 'st-fail': '#B3261E', 'st-unknown': '#6B6560',
    });
  });

  it.each([['light', light], ['dark', dark]])('%s text pairs pass WCAG AA (4.5:1)', (_n, t) => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrast(t[fg], t[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('bronze passes 3:1 as a UI color on surface', () => {
    expect(contrast(light.bronze, light.surface)).toBeGreaterThanOrEqual(3);
  });

  it('dark media-query block equals the explicit dark block', () => {
    expect(darkMedia).toEqual(dark);
  });
});

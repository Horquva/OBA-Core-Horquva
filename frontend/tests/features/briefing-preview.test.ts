import { describe, it, expect } from 'vitest';
import { plainPreview } from '@/features/overview/BriefingCard';

describe('Overview briefing preview', () => {
  it('shows prose, not markdown syntax', () => {
    const md = '# Weekly Operational Continuity Briefing\n### 1. Executive Summary\nThe organization is tracking **4 critical operational assets**.';
    const preview = plainPreview(md, 200);
    expect(preview).not.toMatch(/[#*]/);
    expect(preview).toContain('The organization is tracking 4 critical operational assets.');
  });

  it('truncates long text with an ellipsis', () => {
    expect(plainPreview('word '.repeat(100), 20).endsWith('…')).toBe(true);
  });
});

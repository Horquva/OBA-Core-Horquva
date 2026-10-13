import { describe, it, expect } from 'vitest';
import { problemDetail } from '@/features/overview/AttentionPanel';

describe('Attention row titles', () => {
  it('drops the "Category:" prefix the meta line already shows', () => {
    expect(problemDetail('Single point of failure: unbacked critical asset "Billing Sync"')).toBe('Unbacked critical asset "Billing Sync"');
    expect(problemDetail('Departed owner: "Onboarding" has no active owner')).toBe('"Onboarding" has no active owner');
  });

  it('leaves problems without a short prefix untouched', () => {
    expect(problemDetail('Billing Gateway has no secondary maintainer.')).toBe('Billing Gateway has no secondary maintainer.');
  });
});

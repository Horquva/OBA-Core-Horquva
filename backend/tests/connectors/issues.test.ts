import { describe, it, expect } from 'vitest';
import { SyncIssues } from '../../src/connectors/sdk/issues.js';

describe('SyncIssues', () => {
  it('counts only core failures as errors', () => {
    const issues = new SyncIssues();
    issues.optional('costs', new Error('HTTP Error 403 Forbidden'));
    expect(issues.stats()).toEqual({ errors: 0, errorReasons: [], warnings: ['costs: HTTP Error 403 Forbidden'] });
    issues.core('users', new Error('HTTP Error 500'));
    expect(issues.stats()).toMatchObject({ errors: 1, errorReasons: ['users: HTTP Error 500'] });
  });

  it('caps each reason at 300 characters', () => {
    const issues = new SyncIssues();
    issues.core('users', new Error('x'.repeat(1000)));
    expect(issues.errorReasons[0]).toHaveLength(300);
  });
});

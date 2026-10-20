import { describe, it, expect } from 'vitest';
import { envPoolMax } from '../../src/db/poolSize.js';

describe('envPoolMax', () => {
  it('uses a positive integer from env', () => {
    expect(envPoolMax('PG_POOL_MAX', 10, { PG_POOL_MAX: '5' })).toBe(5);
  });

  it('falls back when unset, zero, negative or not an integer', () => {
    for (const v of [undefined, '', '0', '-3', '2.5', 'many']) {
      expect(envPoolMax('PG_POOL_MAX', 10, { PG_POOL_MAX: v })).toBe(10);
    }
  });
});

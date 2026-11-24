import { describe, it, expect } from 'vitest';
import { DataService } from '../../src/services/dataService.js';

describe('Task 1.2: initialize() mandates DATABASE_URL', () => {
  it('initialize without DATABASE_URL throws in development', async () => {
    await expect(
      DataService.initialize({ NODE_ENV: 'development', DATABASE_URL: '' })
    ).rejects.toThrow('DATABASE_URL must be set: Horquva has no offline data.');
  });

  it('initialize without DATABASE_URL throws in production', async () => {
    await expect(
      DataService.initialize({ NODE_ENV: 'production', DATABASE_URL: '' })
    ).rejects.toThrow('DATABASE_URL must be set: Horquva has no offline data.');
  });
});

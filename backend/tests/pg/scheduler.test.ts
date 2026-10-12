// pg-boss against a real Postgres: queues exist, crons schedule, queued work runs.

import { describe, it, expect, afterAll } from 'vitest';
import { JobScheduler } from '../../src/jobs/scheduler.js';

const scheduler = new JobScheduler();

afterAll(() => scheduler.stopScheduler());

describe('JobScheduler on pg-boss', () => {
  it('starts on pg-boss (required) and runs queued work', async () => {
    const seen: unknown[] = [];
    let done!: () => void;
    const finished = new Promise<void>((r) => (done = r));
    scheduler.registerQueue('test-queue', async (data) => {
      seen.push(data);
      done();
    });

    await scheduler.startScheduler({ requirePgBoss: true });
    expect(scheduler.isUsingPgBoss()).toBe(true);

    await scheduler.enqueue('test-queue', { connectionId: 'conn_x', syncRunId: 'r1' }, { singletonKey: 'conn_x' });
    await Promise.race([finished, new Promise((_, rej) => setTimeout(() => rej(new Error('job never ran')), 15000))]);
    expect(seen).toEqual([{ connectionId: 'conn_x', syncRunId: 'r1' }]);
  });

  it('refuses to fall back to in-process when pg-boss is required', async () => {
    const offline = new JobScheduler({ forceInProcess: true });
    await expect(offline.startScheduler({ requirePgBoss: true })).rejects.toThrow(/pg-boss is required/);
  });
});

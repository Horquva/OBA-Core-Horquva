// =============================================================================
// Horquva Continuity Platform — pg-boss Job Scheduler Vitest Suite
// =============================================================================
// Tests SRS CON-10, CON-11, CHK-04, and CHG-03:
// - Job registration (hourly connector syncs, daily attestation reminders, weekly briefing)
// - Dual-mode architecture (pg-boss with graceful in-process fallback)
// - Manual job triggering
// - Error isolation & resilience (failed jobs do not crash process)
// - Clean lifecycle shutdown (stopScheduler)
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobScheduler } from '../../src/jobs/scheduler.js';

describe('JobScheduler (SRS CON-10, CON-11, CHK-04)', () => {
  let scheduler: JobScheduler;

  beforeEach(() => {
    // Instantiate with forced in-process mode for deterministic unit testing
    scheduler = new JobScheduler({ forceInProcess: true });
  });

  afterEach(async () => {
    await scheduler.stopScheduler();
  });

  describe('1. Lifecycle & Job Registration', () => {
    it('starts scheduler in in-process mode without crashing when live DB is bypassed', async () => {
      await scheduler.startScheduler();
      expect(scheduler.isRunning()).toBe(true);
      expect(scheduler.isUsingPgBoss()).toBe(false);
    });

    it('registers standard core recurring schedules', async () => {
      await scheduler.startScheduler();

      const registered = scheduler.getRegisteredJobs();
      expect(registered).toContain('connector-sync-hourly');
      expect(registered).toContain('attestation-reminders-daily');
      expect(registered).toContain('weekly-briefing-weekly');
    });
  });

  describe('2. Job Execution & Triggering', () => {
    it('executes a custom registered job handler on trigger', async () => {
      let executed = false;
      scheduler.registerJob('custom-sync-job', '0 * * * *', async (data) => {
        expect(data?.connectionId).toBe('conn_n8n_1');
        executed = true;
      });

      await scheduler.startScheduler();
      await scheduler.triggerJob('custom-sync-job', { connectionId: 'conn_n8n_1' });

      expect(executed).toBe(true);
    });

    it('isolates errors when a job handler throws, without crashing scheduler', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      scheduler.registerJob('failing-job', '0 * * * *', async () => {
        throw new Error('Upstream timeout during connector sync');
      });

      await scheduler.startScheduler();

      // Triggering should not throw an uncaught exception
      await expect(scheduler.triggerJob('failing-job')).resolves.not.toThrow();

      // Verify scheduler continues running normally
      expect(scheduler.isRunning()).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('3. Clean Lifecycle Shutdown', () => {
    it('stops scheduler and clears active timers cleanly', async () => {
      await scheduler.startScheduler();
      expect(scheduler.isRunning()).toBe(true);

      await scheduler.stopScheduler();
      expect(scheduler.isRunning()).toBe(false);
    });
  });
});

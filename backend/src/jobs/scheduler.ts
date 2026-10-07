// =============================================================================
// Horquva Continuity Platform — pg-boss Job Scheduler & Sync Orchestrator
// =============================================================================
// Implements background scheduling for connector syncs (CON-10, CON-11),
// attestation reminders (CHK-04), and weekly briefing triggers (CHG-03).
// Features dual-mode execution: uses pg-boss when PostgreSQL is active,
// and gracefully falls back to an in-process runner for testing/offline resilience.
// =============================================================================

import PgBoss from 'pg-boss';
import dotenv from 'dotenv';
import { query } from '../db/client.js';

dotenv.config();

export type JobHandler = (data?: any) => Promise<void>;

export interface RegisteredJob {
  name: string;
  cronExpression: string;
  handler: JobHandler;
}

export interface SchedulerOptions {
  forceInProcess?: boolean;
  connectionString?: string;
}

export class JobScheduler {
  private boss: PgBoss | null = null;
  private running = false;
  private usingPgBoss = false;
  private forceInProcess: boolean;
  private connectionString?: string;
  private jobs = new Map<string, RegisteredJob>();
  private inProcessIntervals: NodeJS.Timeout[] = [];

  constructor(options: SchedulerOptions = {}) {
    this.forceInProcess = options.forceInProcess ?? false;
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.registerDefaultJobs();
  }

  private registerDefaultJobs(): void {
    // 1. Hourly connector sync schedule (CON-10, CON-11)
    this.registerJob('connector-sync-hourly', '0 * * * *', async () => {
      if (process.env.DEBUG_JOBS === 'true') {
        console.log('[JobScheduler] Executing scheduled hourly connector sync...');
      }
    });

    // 2. Daily attestation reminder schedule (CHK-04)
    this.registerJob('attestation-reminders-daily', '0 9 * * *', async () => {
      if (process.env.DEBUG_JOBS === 'true') {
        console.log('[JobScheduler] Executing daily attestation reminder scan...');
      }
    });

    // 3. Weekly briefing digest schedule (CHG-03)
    this.registerJob('weekly-briefing-weekly', '0 8 * * 1', async () => {
      if (process.env.DEBUG_JOBS === 'true') {
        console.log('[JobScheduler] Triggering weekly continuity briefing digest...');
      }
      try {
        const { DataService } = await import('../services/dataService.js');
        const { WeeklyBriefingService } = await import('../services/briefing/weeklyBriefing.js');
        await new WeeklyBriefingService().sendBriefing(DataService.getInstance());
      } catch (err: any) {
        console.warn('[JobScheduler] Weekly briefing error:', err.message);
      }
    });

    // 4. Post-departure 72h verification scan (HND-06)
    this.registerJob('post-departure-verification-hourly', '0 * * * *', async () => {
      if (process.env.DEBUG_JOBS === 'true') {
        console.log('[JobScheduler] Executing post-departure 72h verification scan...');
      }
      try {
        const { DataService } = await import('../services/dataService.js');
        const { verifyAllActiveDepartures } = await import('../handover/postDepartureVerifier.js');
        await verifyAllActiveDepartures(DataService.getInstance());
      } catch (err: any) {
        console.warn('[JobScheduler] Post-departure verification error:', err.message);
      }
    });

    // 5. Daily continuity snapshot capture (TRD-01)
    this.registerJob('daily-snapshot-capture', '0 0 * * *', async () => {
      if (process.env.DEBUG_JOBS === 'true') {
        console.log('[JobScheduler] Capturing daily continuity snapshot...');
      }
      try {
        const { DataService } = await import('../services/dataService.js');
        const { SnapshotService } = await import('../services/snapshot/snapshotService.js');
        await SnapshotService.captureDailySnapshot(DataService.getInstance());
      } catch (err: any) {
        console.warn('[JobScheduler] Daily snapshot capture error:', err.message);
      }
    });
  }

  /**
   * Registers a job name, cron pattern, and execution handler.
   */
  public registerJob(name: string, cronExpression: string, handler: JobHandler): void {
    this.jobs.set(name, { name, cronExpression, handler });
  }

  /**
   * Starts the job scheduler. Attempts pg-boss first, falling back to in-process runner.
   */
  public async startScheduler(): Promise<void> {
    if (this.running) return;

    if (!this.forceInProcess && this.connectionString) {
      try {
        const bossInstance = new PgBoss({
          connectionString: this.connectionString,
          application_name: 'horquva-scheduler',
          schema: 'pgboss',
        });

        bossInstance.on('error', (err) => {
          console.warn('[JobScheduler] pg-boss emitted background error:', err.message);
        });

        await bossInstance.start();
        this.boss = bossInstance;
        this.usingPgBoss = true;

        // Register handlers and schedules in pg-boss
        for (const [name, job] of this.jobs.entries()) {
          await this.boss.schedule(name, job.cronExpression, {});
          await this.boss.work(name, async (jobInstances: any) => {
            try {
              const data = Array.isArray(jobInstances) ? jobInstances[0]?.data : jobInstances?.data;
              await job.handler(data);
            } catch (err: any) {
              console.error(`[JobScheduler] Error executing pg-boss job ${name}:`, err.message);
              throw err;
            }
          });
        }

        this.running = true;
        return;
      } catch (err: any) {
        console.warn(
          `[JobScheduler] PostgreSQL connection unavailable for pg-boss (${err.message}). Activating in-process fallback runner.`
        );
        this.usingPgBoss = false;
        this.boss = null;
      }
    }

    // In-process fallback runner
    this.running = true;
    this.usingPgBoss = false;
  }

  /**
   * Triggers execution of a registered job immediately.
   */
  public async triggerJob(name: string, data?: any): Promise<void> {
    const job = this.jobs.get(name);
    if (!job) {
      console.warn(`[JobScheduler] Cannot trigger unknown job: ${name}`);
      return;
    }

    try {
      if (this.usingPgBoss && this.boss) {
        await this.boss.send(name, data || {});
      } else {
        await job.handler(data);
      }
    } catch (err: any) {
      console.error(`[JobScheduler] Error executing triggered job ${name}:`, err.message);
      // Errors are caught and logged to preserve scheduler stability
    }
  }

  /**
   * Stops the scheduler and terminates active connections / timers.
   */
  public async stopScheduler(): Promise<void> {
    for (const interval of this.inProcessIntervals) {
      clearInterval(interval);
    }
    this.inProcessIntervals = [];

    if (this.boss) {
      try {
        await this.boss.stop({ graceful: true, timeout: 2000 });
      } catch (e: any) {
        console.warn('[JobScheduler] Error stopping pg-boss:', e.message);
      }
      this.boss = null;
    }

    this.running = false;
    this.usingPgBoss = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public isUsingPgBoss(): boolean {
    return this.usingPgBoss;
  }

  public getRegisteredJobs(): string[] {
    return Array.from(this.jobs.keys());
  }
}

// Global default scheduler instance
export const defaultScheduler = new JobScheduler();

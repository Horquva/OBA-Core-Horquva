// =============================================================================
// Horquva Continuity Platform — pg-boss Job Scheduler & Sync Orchestrator
// =============================================================================
// Implements background scheduling for connector syncs (CON-10, CON-11),
// attestation reminders (CHK-04), and weekly briefing triggers (CHG-03).
// Two kinds of work:
// - recurring jobs (cron), scheduled in pg-boss;
// - on-demand queues (e.g. one connector sync behind a 202), sent to pg-boss.
// Without pg-boss (tests, dev without a database) queued work runs in-process
// on the next tick and recurring jobs do not fire; production refuses to run
// without pg-boss (startScheduler({ requirePgBoss: true })).
// =============================================================================

import PgBoss from 'pg-boss';
import dotenv from 'dotenv';

dotenv.config();

export type JobHandler = (data?: any) => Promise<void>;

export interface RegisteredJob {
  name: string;
  cronExpression: string;
  handler: JobHandler;
}

export interface QueueOptions {
  /** Drops the job if one with the same key is already queued or active. */
  singletonKey?: string;
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
  private queues = new Map<string, JobHandler>();
  private inProcessIntervals: NodeJS.Timeout[] = [];

  constructor(options: SchedulerOptions = {}) {
    this.forceInProcess = options.forceInProcess ?? false;
    this.connectionString = options.connectionString || process.env.DATABASE_URL;
    this.registerDefaultJobs();
  }

  private registerDefaultJobs(): void {
    // 1. Hourly connector sync schedule (CON-10, CON-11)
    this.registerJob('connector-sync-hourly', '0 * * * *', async () => {
      const { ConnectorRunner } = await import('../connectors/sdk/runner.js');
      const started = await ConnectorRunner.syncAll();
      if (process.env.DEBUG_JOBS === 'true') console.log(`[JobScheduler] Hourly connector sync ran ${started} connection(s).`);
    });

    // On-demand: one claimed sync (POST /api/connections/:id/sync → 202)
    this.registerQueue('connector-sync', async (data: { connectionId: string; syncRunId: string }) => {
      const { ConnectorRunner } = await import('../connectors/sdk/runner.js');
      await ConnectorRunner.executeSync(data.connectionId, data.syncRunId);
    });

    // 2. Daily attestation reminder schedule (CHK-04)
    this.registerJob('attestation-reminders-daily', '0 9 * * *', async () => {
      const { DataService } = await import('../services/dataService.js');
      const { sendDueReminders } = await import('../attestation/attestationService.js');
      const sent = await sendDueReminders(DataService.getInstance());
      if (process.env.DEBUG_JOBS === 'true') console.log(`[JobScheduler] Sent ${sent} attestation reminder(s).`);
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

  /** Registers an on-demand queue worked by `handler` (see enqueue()). */
  public registerQueue(name: string, handler: JobHandler): void {
    this.queues.set(name, handler);
  }

  /**
   * Queues one piece of work. With pg-boss it survives a restart; otherwise it
   * runs in-process on the next tick (errors are logged, never thrown here).
   */
  public async enqueue(name: string, data: object, options: QueueOptions = {}): Promise<void> {
    const handler = this.queues.get(name);
    if (!handler) throw new Error(`Unknown queue: ${name}`);
    if (this.usingPgBoss && this.boss) {
      await this.boss.send(name, data, options.singletonKey ? { singletonKey: options.singletonKey } : {});
      return;
    }
    setImmediate(() => {
      handler(data).catch((err) => console.error(`[JobScheduler] Queued job ${name} failed:`, err));
    });
  }

  /**
   * Starts the job scheduler. Attempts pg-boss first, falling back to in-process runner
   * unless `requirePgBoss` (production), in which case a pg-boss failure is fatal.
   */
  public async startScheduler(opts: { requirePgBoss?: boolean } = {}): Promise<void> {
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

        // pg-boss 10 needs a queue to exist before it can be scheduled, sent to or worked.
        for (const name of [...this.jobs.keys(), ...this.queues.keys()]) {
          await this.boss.createQueue(name);
        }

        for (const [name, handler] of this.queues.entries()) {
          await this.boss.work(name, async (jobInstances: any) => {
            const list = Array.isArray(jobInstances) ? jobInstances : [jobInstances];
            for (const j of list) await handler(j?.data);
          });
        }

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
        if (opts.requirePgBoss) throw new Error(`pg-boss could not start: ${err.message}`);
        console.warn(
          `[JobScheduler] PostgreSQL connection unavailable for pg-boss (${err.message}). Activating in-process fallback runner.`
        );
        this.usingPgBoss = false;
        this.boss = null;
      }
    }

    if (opts.requirePgBoss) throw new Error('pg-boss is required (no DATABASE_URL, or in-process mode was forced).');
    // In-process fallback: queued work runs immediately; recurring jobs need pg-boss.
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

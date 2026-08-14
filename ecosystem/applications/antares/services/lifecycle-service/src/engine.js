'use strict';

const {
  JobStatus,
  SATISFYING_STATES,
  ALLOWED_TRANSITIONS,
  Platform,
  EngineeringJob,
  Execution,
  EngineeringEvent,
} = require('./models');
const { runQualityGates } = require('./qualityGates');

/**
 * engine.js
 * ---------
 * This whole file IS "Kamil's platform" — Antares Engineering Operations.
 * It does not discover or validate any capability itself. It only:
 *   1) registers platforms
 *   2) tracks jobs (dependencies + status)
 *   3) runs quality gates
 *   4) computes observability metrics
 *   5) provides a rule-based "AI assistant" that answers questions from
 *      REAL state (not an LLM — deterministic reasoning, so the result
 *      is always evidence-backed)
 */
class EngineeringOperationsEngine {
  constructor() {
    this.platforms = new Map(); // id -> Platform
    this.jobs = new Map(); // id -> EngineeringJob
    this.executions = new Map(); // id -> Execution (Day 3-4)
    this.events = []; // append-only observability feed
    this._executionCounter = 0;
  }

  // ---------- Day 2/3: platform + job registration ----------

  registerPlatform(platformInput) {
    const platform = new Platform(platformInput);
    if (this.platforms.has(platform.id)) {
      throw new Error(`Platform already registered: ${platform.id}`);
    }
    this.platforms.set(platform.id, platform);
    this._emit('PLATFORM_REGISTERED', null, platform.id, `Platform registered: ${platform.name} (${platform.owner})`);
    return platform;
  }

  createJob({ id, platformId, task, dependsOn = [] }) {
    if (!this.platforms.has(platformId)) {
      throw new Error(`Cannot create job for unknown platform: ${platformId}`);
    }
    if (this.jobs.has(id)) {
      throw new Error(`Job already exists: ${id}`);
    }
    for (const depId of dependsOn) {
      if (!this.jobs.has(depId)) {
        throw new Error(`Job ${id} depends on unknown job: ${depId}`);
      }
    }
    const job = new EngineeringJob({ id, platformId, task, dependsOn });
    this.jobs.set(id, job);
    this._emit('JOB_CREATED', job.id, platformId, `Job created: ${task}`);
    this._recomputeBlocked(job.id);
    return job;
  }

  attachEvidence(jobId, evidenceRef) {
    const job = this._getJob(jobId);
    job.evidence.push({ ref: evidenceRef, attachedAt: new Date().toISOString() });
    this._emit('EVIDENCE_ATTACHED', jobId, job.platformId, `Evidence attached: ${evidenceRef}`);
    return job;
  }

  // ---------- Day 3-4: status flow / orchestration ----------

  /** Resolves whether each declared dependency is currently satisfied. */
  _dependencyStatuses(job) {
    return job.dependsOn.map((depId) => {
      const dep = this.jobs.get(depId);
      const satisfied = !!dep && SATISFYING_STATES.has(dep.status);
      return { jobId: depId, satisfied, status: dep ? dep.status : 'UNKNOWN' };
    });
  }

  _recomputeBlocked(jobId) {
    const job = this._getJob(jobId);
    if (![JobStatus.QUEUED, JobStatus.BLOCKED].includes(job.status)) return;
    const deps = this._dependencyStatuses(job);
    const blocked = deps.some((d) => !d.satisfied);
    const target = blocked ? JobStatus.BLOCKED : JobStatus.QUEUED;
    if (job.status !== target) {
      this._setStatus(job, target, blocked ? `Blocked on: ${deps.filter((d) => !d.satisfied).map((d) => d.jobId).join(', ')}` : 'Dependencies satisfied, unblocked');
    }
  }

  _setStatus(job, newStatus, note) {
    const from = job.status;
    if (from !== newStatus && !ALLOWED_TRANSITIONS[from].includes(newStatus) && from !== newStatus) {
      // BLOCKED<->QUEUED is a system-managed side transition, always allowed
      const systemManaged = (from === JobStatus.QUEUED && newStatus === JobStatus.BLOCKED) ||
        (from === JobStatus.BLOCKED && newStatus === JobStatus.QUEUED);
      if (!systemManaged) {
        throw new Error(`Illegal transition for ${job.id}: ${from} -> ${newStatus}`);
      }
    }
    job.status = newStatus;
    job.history.push({ status: newStatus, at: new Date().toISOString(), note });
    this._emit('STATUS_CHANGE', job.id, job.platformId, `${from} -> ${newStatus}${note ? ' (' + note + ')' : ''}`);
  }

  /** Start executing a queued job. triggeredBy = who/what kicked this off (for accountability). */
  start(jobId, triggeredBy = 'system') {
    const job = this._getJob(jobId);
    this._recomputeBlocked(jobId);
    if (job.status === JobStatus.BLOCKED) {
      throw new Error(`Cannot start ${jobId} — still BLOCKED on unmet dependencies`);
    }
    if (job.status !== JobStatus.QUEUED) {
      throw new Error(`Cannot start ${jobId} from status ${job.status}`);
    }
    this._setStatus(job, JobStatus.RUNNING, 'Execution started');

    this._executionCounter += 1;
    const execution = new Execution({ id: `EXEC-${this._executionCounter}`, jobId, triggeredBy });
    this.executions.set(execution.id, execution);
    job.executions.push(execution.id);
    this._emit('EXECUTION_STARTED', jobId, job.platformId, `${execution.id} started by ${triggeredBy}`);

    return job;
  }

  /** Returns the execution that is currently open (no endedAt) for a job, if any. */
  _openExecution(jobId) {
    const job = this._getJob(jobId);
    const lastId = job.executions[job.executions.length - 1];
    const exec = lastId ? this.executions.get(lastId) : null;
    return exec && exec.endedAt === null ? exec : null;
  }

  /** Every job's full execution history — one entry per attempt, newest last. */
  getExecutionHistory(jobId) {
    const job = this._getJob(jobId);
    return job.executions.map((id) => this.executions.get(id));
  }

  /**
   * Submit the artifact a job produced and run it through quality gates.
   * This is the ONLY way a job can move to PASSED — no manual override.
   */
  submitForValidation(jobId, artifact) {
    const job = this._getJob(jobId);
    if (job.status !== JobStatus.RUNNING) {
      throw new Error(`Cannot validate ${jobId} from status ${job.status}`);
    }
    this._setStatus(job, JobStatus.VALIDATING, 'Quality gates running');
    job.artifact = artifact;

    const depStatuses = this._dependencyStatuses(job);
    const result = runQualityGates(job, artifact, depStatuses);
    job.qualityGateResult = result;

    if (result.passed) {
      this._setStatus(job, JobStatus.PASSED, 'All quality gates passed');
    } else {
      const failedNames = result.checks.filter((c) => !c.passed).map((c) => c.name);
      this._setStatus(job, JobStatus.FAILED, `Gate failure: ${failedNames.join(', ')}`);
      this._emit('GATE_FAILED', job.id, job.platformId, `Failed checks: ${failedNames.join(', ')}`);
    }

    const exec = this._openExecution(jobId);
    if (exec) {
      exec.endedAt = new Date().toISOString();
      exec.result = result.passed ? 'PASSED' : 'FAILED';
    }
    return job;
  }

  /** Retry a failed job — sends it back to QUEUED (re-evaluates dependencies). */
  retry(jobId) {
    const job = this._getJob(jobId);
    if (job.status !== JobStatus.FAILED) {
      throw new Error(`Cannot retry ${jobId} from status ${job.status}`);
    }
    this._setStatus(job, JobStatus.QUEUED, 'Requeued for retry');
    this._recomputeBlocked(jobId);
    return job;
  }

  /** Mark a PASSED job as consumed/integrated by the downstream system. */
  integrate(jobId) {
    const job = this._getJob(jobId);
    if (job.status !== JobStatus.PASSED) {
      throw new Error(`Cannot integrate ${jobId} from status ${job.status}`);
    }
    this._setStatus(job, JobStatus.INTEGRATED, 'Consumed by downstream platform');
    this._emit('INTEGRATION', job.id, job.platformId, 'Integrated downstream');
    // unblock anything waiting on this job
    for (const other of this.jobs.values()) {
      if (other.dependsOn.includes(jobId)) this._recomputeBlocked(other.id);
    }
    return job;
  }

  releaseReady(jobId) {
    const job = this._getJob(jobId);
    if (job.status !== JobStatus.INTEGRATED) {
      throw new Error(`Cannot release ${jobId} from status ${job.status}`);
    }
    this._setStatus(job, JobStatus.RELEASE_READY, 'Marked release-ready');
    return job;
  }

  // ---------- Day 6: observability ----------

  getSystemHealth() {
    const jobs = [...this.jobs.values()];
    const total = jobs.length;
    const byStatus = {};
    for (const s of Object.values(JobStatus)) byStatus[s] = 0;
    for (const j of jobs) byStatus[j.status]++;

    const evaluated = jobs.filter((j) => j.qualityGateResult);
    const gatePassRate = evaluated.length
      ? Math.round((evaluated.filter((j) => j.qualityGateResult.passed).length / evaluated.length) * 100)
      : 100;

    return {
      totalPlatforms: this.platforms.size,
      totalJobs: total,
      byStatus,
      blocked: byStatus.BLOCKED,
      failed: byStatus.FAILED,
      releaseReady: byStatus.RELEASE_READY,
      integrated: byStatus.INTEGRATED,
      gatePassRatePct: gatePassRate,
      healthLabel: byStatus.FAILED > 0 || byStatus.BLOCKED > 0 ? 'ATTENTION_NEEDED' : 'HEALTHY',
    };
  }

  getPlatformHealth(platformId) {
    const jobs = [...this.jobs.values()].filter((j) => j.platformId === platformId);
    const byStatus = {};
    for (const s of Object.values(JobStatus)) byStatus[s] = 0;
    for (const j of jobs) byStatus[j.status]++;
    return { platformId, totalJobs: jobs.length, byStatus };
  }

  recentEvents(limit = 10) {
    return this.events.slice(-limit).reverse();
  }

  // ---------- Day 7: rule-based AI Engineering Operations Assistant ----------
  // Deterministic reasoning over REAL state — never invents information.

  findBlockedJobs() {
    return [...this.jobs.values()].filter((j) => j.status === JobStatus.BLOCKED);
  }

  explainBlock(jobId) {
    const job = this._getJob(jobId);
    if (job.status !== JobStatus.BLOCKED) {
      return `${jobId} is not blocked (current status: ${job.status}).`;
    }
    const deps = this._dependencyStatuses(job).filter((d) => !d.satisfied);
    return `${jobId} (${job.task}) is BLOCKED because dependency(ies) not yet satisfied: ` +
      deps.map((d) => `${d.jobId} [${d.status}]`).join(', ');
  }

  findFailedJobs() {
    return [...this.jobs.values()].filter((j) => j.status === JobStatus.FAILED);
  }

  explainFailure(jobId) {
    const job = this._getJob(jobId);
    if (!job.qualityGateResult) return `${jobId} has no recorded quality-gate result.`;
    const failed = job.qualityGateResult.checks.filter((c) => !c.passed);
    if (failed.length === 0) return `${jobId} passed all quality gates.`;
    return `${jobId} (${job.task}) failed on: ` + failed.map((c) => `${c.name} — ${c.message}`).join('; ');
  }

  /**
   * Day 7: platform-level view of blocking — "which PLATFORM is blocked
   * is it, and why" is a different question than "which JOB is blocked is it".
   * One platform can own several jobs; this groups by platform and
   * explains each one's blocked jobs together.
   */
  findBlockedPlatforms() {
    const blockedJobs = this.findBlockedJobs();
    const byPlatform = new Map();
    for (const job of blockedJobs) {
      if (!byPlatform.has(job.platformId)) byPlatform.set(job.platformId, []);
      byPlatform.get(job.platformId).push(job);
    }
    return [...byPlatform.entries()].map(([platformId, jobs]) => {
      const platform = this.platforms.get(platformId);
      return {
        platformId,
        platformName: platform ? platform.name : platformId,
        owner: platform ? platform.owner : 'unknown',
        blockedJobs: jobs,
      };
    });
  }

  explainPlatformBlockage(platformId) {
    const platform = this.platforms.get(platformId);
    if (!platform) return `Unknown platform: ${platformId}`;
    const jobs = [...this.jobs.values()].filter((j) => j.platformId === platformId && j.status === JobStatus.BLOCKED);
    if (jobs.length === 0) {
      return `${platform.name} (${platform.owner}) — no jobs are blocked.`;
    }
    return `${platform.name} (${platform.owner}) — ${jobs.length} job(s) blocked:\n` +
      jobs.map((j) => '  ' + this.explainBlock(j.id)).join('\n');
  }

  /**
   * Finds a platform by matching the question text against platform
   * names and owner names (case-insensitive substring match). Returns
   * null if no platform is mentioned — the assistant then falls back
   * to a system-wide answer instead of guessing.
   */
  _findMentionedPlatform(question) {
    const q = question.toLowerCase();
    for (const platform of this.platforms.values()) {
      const nameHit = platform.name && q.includes(platform.name.toLowerCase());
      const ownerHit = platform.owner && q.includes(platform.owner.toLowerCase());
      const ownerFirstNameHit = platform.owner && q.includes(platform.owner.toLowerCase().split(' ')[0]);
      if (nameHit || ownerHit || ownerFirstNameHit) return platform;
    }
    return null;
  }

  /**
   * Very small deterministic NLU: routes a natural-language question to
   * the correct real-data function via keyword matching. This is
   * intentionally NOT a generative model — it must never hallucinate
   * system state, per Antares AI policy.
   */
  askAssistant(question) {
    const q = (question || '').toLowerCase();
    const mentionedPlatform = this._findMentionedPlatform(question || '');

    if (q.includes('block')) {
      // Day 7: "which platform is blocked, and why" — platform-specific if named
      if (mentionedPlatform) return this.explainPlatformBlockage(mentionedPlatform.id);

      const blockedPlatforms = this.findBlockedPlatforms();
      if (blockedPlatforms.length === 0) return 'No platform or job is currently blocked.';
      return blockedPlatforms
        .map((bp) => `${bp.platformName} (${bp.owner}) — ${bp.blockedJobs.length} job(s) blocked:\n` +
          bp.blockedJobs.map((j) => '  ' + this.explainBlock(j.id)).join('\n'))
        .join('\n');
    }
    if (q.includes('fail')) {
      if (mentionedPlatform) {
        const jobs = [...this.jobs.values()].filter((j) => j.platformId === mentionedPlatform.id && j.status === JobStatus.FAILED);
        if (jobs.length === 0) return `${mentionedPlatform.name} (${mentionedPlatform.owner}) — no jobs have failed.`;
        return jobs.map((j) => this.explainFailure(j.id)).join('\n');
      }
      const failed = this.findFailedJobs();
      if (failed.length === 0) return 'No job is currently in a failed state.';
      return failed.map((j) => this.explainFailure(j.id)).join('\n');
    }
    if (q.includes('health') || q.includes('status')) {
      if (mentionedPlatform) {
        const ph = this.getPlatformHealth(mentionedPlatform.id);
        return `${mentionedPlatform.name} (${mentionedPlatform.owner}): ${ph.totalJobs} jobs — ` +
          Object.entries(ph.byStatus).filter(([, count]) => count > 0).map(([status, count]) => `${status}:${count}`).join(', ');
      }
      const h = this.getSystemHealth();
      return `System health: ${h.healthLabel}. ${h.totalJobs} jobs total — ${h.blocked} blocked, ${h.failed} failed, ${h.integrated} integrated, ${h.releaseReady} release-ready. Gate pass rate: ${h.gatePassRatePct}%.`;
    }
    if (q.includes('recent') || q.includes('change') || q.includes('event')) {
      return this.recentEvents(5).map((e) => `[${e.type}] ${e.message}`).join('\n');
    }
    return "I didn't understand that — try asking: 'what is blocked', 'what has failed', 'what is the system health', or 'what changed recently'. You can also name a platform or team member, e.g. 'is Zara's work blocked?'.";
  }

  // ---------- internal ----------

  _getJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}`);
    return job;
  }

  _emit(type, jobId, platformId, message) {
    this.events.push(new EngineeringEvent({ type, jobId, platformId, message }));
  }

  /** Serialisable snapshot — used to feed the dashboard. */
  snapshot() {
    return {
      platforms: [...this.platforms.values()],
      jobs: [...this.jobs.values()],
      executions: [...this.executions.values()],
      systemHealth: this.getSystemHealth(),
      recentEvents: this.recentEvents(15),
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = { EngineeringOperationsEngine };

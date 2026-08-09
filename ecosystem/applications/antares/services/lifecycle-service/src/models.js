'use strict';

/**
 * ANTARES — ENGINEERING OPERATIONS PLATFORM
 * Owner: Kamil Ejaz (Engineering Lead)
 *
 * models.js
 * ---------
 * Yahan sab core data shapes aur enums define hain. Ye poore engine ka
 * "vocabulary" hai — Platform, EngineeringJob, Status, QualityGateResult,
 * EngineeringEvent. Har cheez yahan se shuru hoti hai.
 */

/** Job lifecycle states (locked, Din 3-4 requirement). */
const JobStatus = Object.freeze({
  QUEUED: 'QUEUED',
  BLOCKED: 'BLOCKED', // waiting on an unmet dependency
  RUNNING: 'RUNNING',
  VALIDATING: 'VALIDATING', // quality gates executing
  FAILED: 'FAILED', // quality gates rejected the output
  PASSED: 'PASSED', // quality gates accepted the output
  INTEGRATED: 'INTEGRATED', // consumed by at least one downstream job
  RELEASE_READY: 'RELEASE_READY',
});

/** Which states count as "successfully satisfies a dependency". */
const SATISFYING_STATES = new Set([
  JobStatus.PASSED,
  JobStatus.INTEGRATED,
  JobStatus.RELEASE_READY,
]);

/** Legal forward transitions. Anything not listed here is rejected. */
const ALLOWED_TRANSITIONS = Object.freeze({
  QUEUED: ['BLOCKED', 'RUNNING'],
  BLOCKED: ['QUEUED', 'RUNNING'],
  RUNNING: ['VALIDATING', 'FAILED'],
  VALIDATING: ['PASSED', 'FAILED'],
  FAILED: ['QUEUED', 'RUNNING'], // retry loop
  PASSED: ['INTEGRATED'],
  INTEGRATED: ['RELEASE_READY'],
  RELEASE_READY: [],
});

/**
 * A Platform is one of the 10 Antares ownership areas
 * (Technology Intelligence, Capability Validation, etc.)
 */
class Platform {
  constructor({ id, name, owner, description }) {
    if (!id || !name || !owner) {
      throw new Error('Platform requires id, name and owner');
    }
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.description = description || '';
    this.registeredAt = new Date().toISOString();
  }
}

/**
 * An EngineeringJob is one unit of tracked work belonging to a platform —
 * e.g. "Zara: run capability assessment on CAP-014".
 * dependsOn = array of other job ids that must PASS/INTEGRATE first.
 */
class EngineeringJob {
  constructor({ id, platformId, task, dependsOn = [] }) {
    if (!id || !platformId || !task) {
      throw new Error('EngineeringJob requires id, platformId and task');
    }
    this.id = id;
    this.platformId = platformId;
    this.task = task;
    this.dependsOn = dependsOn;
    this.status = JobStatus.QUEUED;
    this.artifact = null; // the actual output payload once produced
    this.evidence = []; // evidence references attached to this job
    this.qualityGateResult = null;
    this.executions = []; // list of Execution ids — one per attempt (Din 3-4)
    this.history = [
      { status: JobStatus.QUEUED, at: new Date().toISOString(), note: 'Job created' },
    ];
  }
}

/**
 * An Execution represents ONE ATTEMPT at running a job. A job can have
 * several executions over time (e.g. attempt 1 fails, attempt 2 passes)
 * — this is the "Execution" piece of the Din 3-4 Job Model
 * (Platform·Task·Dependency·Execution·Status). Without this, a retry
 * would silently overwrite history with no record of how long the
 * previous attempt took or who triggered it.
 */
class Execution {
  constructor({ id, jobId, triggeredBy }) {
    this.id = id;
    this.jobId = jobId;
    this.triggeredBy = triggeredBy || 'system';
    this.startedAt = new Date().toISOString();
    this.endedAt = null;
    this.result = null; // null while running, else 'PASSED' | 'FAILED'
  }
}

/** A structured record of "something happened" — feeds the observability feed. */
class EngineeringEvent {
  constructor({ type, jobId, platformId, message }) {
    this.type = type; // e.g. 'STATUS_CHANGE' | 'GATE_FAILED' | 'BLOCKED' | 'INTEGRATION'
    this.jobId = jobId;
    this.platformId = platformId;
    this.message = message;
    this.at = new Date().toISOString();
  }
}

module.exports = {
  JobStatus,
  SATISFYING_STATES,
  ALLOWED_TRANSITIONS,
  Platform,
  EngineeringJob,
  Execution,
  EngineeringEvent,
};

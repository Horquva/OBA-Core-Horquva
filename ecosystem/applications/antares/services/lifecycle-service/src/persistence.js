'use strict';

const fs = require('fs');
const path = require('path');

const { EngineeringOperationsEngine } = require('./engine');
const { Platform, EngineeringJob, Execution, EngineeringEvent } = require('./models');

/**
 * persistence.js
 * --------------
 * Day 2's most important piece: "foundation" means the data survives
 * after the program exits. Until now the engine only lived in RAM —
 * this file closes that gap.
 *
 * This is not a real database (that comes later, once Postgres/Mongo
 * is wired into the real Antares repo) — but it IS real persistence:
 * close the process, restart the computer, the data comes back.
 */

const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'store', 'state.json');

/** Saves the engine's full state to a JSON file on disk. */
function saveState(engine, storePath = DEFAULT_STORE_PATH) {
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const payload = {
    savedAt: new Date().toISOString(),
    platforms: [...engine.platforms.values()],
    jobs: [...engine.jobs.values()],
    executions: [...engine.executions.values()],
    events: engine.events,
  };
  fs.writeFileSync(storePath, JSON.stringify(payload, null, 2));
  return storePath;
}

/**
 * Loads a previously saved state back into a fresh
 * EngineeringOperationsEngine instance. Returns null if no saved
 * state exists yet (first run).
 */
function loadState(storePath = DEFAULT_STORE_PATH) {
  if (!fs.existsSync(storePath)) return null;

  const raw = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  const engine = new EngineeringOperationsEngine();

  for (const p of raw.platforms) {
    const platform = Object.assign(Object.create(Platform.prototype), p);
    engine.platforms.set(platform.id, platform);
  }
  for (const j of raw.jobs) {
    const job = Object.assign(Object.create(EngineeringJob.prototype), j);
    engine.jobs.set(job.id, job);
  }
  for (const ex of raw.executions || []) {
    const execution = Object.assign(Object.create(Execution.prototype), ex);
    engine.executions.set(execution.id, execution);
  }
  engine._executionCounter = (raw.executions || []).length;
  for (const e of raw.events) {
    engine.events.push(Object.assign(Object.create(EngineeringEvent.prototype), e));
  }
  return engine;
}

/** Loads existing state if present, otherwise returns a brand-new empty engine. */
function loadOrCreate(storePath = DEFAULT_STORE_PATH) {
  return loadState(storePath) || new EngineeringOperationsEngine();
}

module.exports = { saveState, loadState, loadOrCreate, DEFAULT_STORE_PATH };

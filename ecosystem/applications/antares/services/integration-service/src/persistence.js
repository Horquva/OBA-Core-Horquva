'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Persistence — the Din 2 Submit -> Register -> Persist -> Retrieve foundation flow.
 * Records are stored as one JSON file per capability under data/records/<ID>.json.
 * A separate registry.json tracks ID -> latest readiness state for fast dependency lookups
 * (used by dependencyEngine.js) without needing to open every record file.
 */

const RECORDS_DIR = path.join(__dirname, '..', 'data', 'records');
const REGISTRY_PATH = path.join(__dirname, '..', 'data', 'registry.json');

class DuplicateSubmissionError extends Error {
  constructor(id) {
    super(`capability "${id}" has already been submitted to this platform`);
    this.name = 'DuplicateSubmissionError';
  }
}

class NotFoundError extends Error {
  constructor(id) {
    super(`no capability record found for id "${id}"`);
    this.name = 'NotFoundError';
  }
}

function ensureDirs() {
  fs.mkdirSync(RECORDS_DIR, { recursive: true });
  if (!fs.existsSync(REGISTRY_PATH)) {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify({ nextSeq: 1, capabilities: {} }, null, 2));
  }
}

function loadRegistry() {
  ensureDirs();
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
}

function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

/** Assigns the next sequential Capability ID, e.g. COP-0005. */
function assignId(registry) {
  const id = `COP-${String(registry.nextSeq).padStart(4, '0')}`;
  registry.nextSeq += 1;
  return id;
}

function recordPath(id) {
  return path.join(RECORDS_DIR, `${id}.json`);
}

function recordExists(id) {
  ensureDirs();
  return fs.existsSync(recordPath(id));
}

/** Register: assigns identity + writes the initial record. Rejects duplicate IDs. */
function register(capability) {
  ensureDirs();
  const registry = loadRegistry();

  let id = capability.id;
  if (id && recordExists(id)) {
    throw new DuplicateSubmissionError(id);
  }
  if (!id) {
    id = assignId(registry);
  }

  const record = { ...capability, id };
  fs.writeFileSync(recordPath(id), JSON.stringify(record, null, 2));

  registry.capabilities[id] = {
    name: record.name,
    readinessState: record.readinessState || null,
    version: record.version || '0.1',
    dependencies: (record.dependencies || []).map((d) => d.id),
  };
  saveRegistry(registry);

  return record;
}

/** Persist: overwrite an existing record (used after later pipeline steps mutate it). */
function persist(capability) {
  ensureDirs();
  if (!capability.id) throw new Error('cannot persist a capability without an id');
  fs.writeFileSync(recordPath(capability.id), JSON.stringify(capability, null, 2));

  const registry = loadRegistry();
  registry.capabilities[capability.id] = {
    name: capability.name,
    readinessState: capability.readinessState || null,
    version: capability.version || '0.1',
    dependencies: (capability.dependencies || []).map((d) => d.id),
  };
  saveRegistry(registry);
  return capability;
}

/** Retrieve: look up a record by ID. */
function retrieve(id) {
  ensureDirs();
  if (!recordExists(id)) throw new NotFoundError(id);
  return JSON.parse(fs.readFileSync(recordPath(id), 'utf8'));
}

/** List every record whose current readiness state is in `states` (used by consumers). */
function findByReadiness(states) {
  ensureDirs();
  const registry = loadRegistry();
  return Object.entries(registry.capabilities)
    .filter(([, meta]) => states.includes(meta.readinessState))
    .map(([id]) => retrieve(id));
}

module.exports = {
  RECORDS_DIR,
  REGISTRY_PATH,
  ensureDirs,
  loadRegistry,
  saveRegistry,
  register,
  persist,
  retrieve,
  recordExists,
  findByReadiness,
  DuplicateSubmissionError,
  NotFoundError,
};

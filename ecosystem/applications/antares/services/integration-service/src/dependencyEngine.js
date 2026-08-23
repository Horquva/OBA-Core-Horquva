'use strict';

const persistence = require('./persistence');

/**
 * Din 5 — Dependency + Readiness Engine.
 * Resolves a capability's declared dependencies against the live registry
 * (programmatically — not a spreadsheet), detects circular dependencies via
 * graph traversal, checks version compatibility, and evaluates the overall
 * readiness state from the resolution result.
 */

class DependencyTimeoutError extends Error {
  constructor(depId) {
    super(`registry lookup for dependency "${depId}" timed out`);
    this.name = 'DependencyTimeoutError';
  }
}

function withTimeout(promise, ms, onTimeoutError) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(onTimeoutError), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Simulates an async registry lookup (real system: a network/service call). */
function lookupRegistryEntry(depId, { simulatedDelayMs = 0 } = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const registry = persistence.loadRegistry();
      resolve(registry.capabilities[depId] || null);
    }, simulatedDelayMs);
  });
}

/**
 * Detects a circular dependency chain starting from `startId` using the given
 * edge map (id -> [dependency ids]). Returns the cycle path if one exists, else null.
 */
function detectCircular(startId, edges) {
  const visited = new Set();
  const stack = [];

  function dfs(node) {
    if (stack.includes(node)) {
      return [...stack.slice(stack.indexOf(node)), node];
    }
    if (visited.has(node)) return null;
    visited.add(node);
    stack.push(node);
    for (const next of edges[node] || []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    stack.pop();
    return null;
  }

  return dfs(startId);
}

/** Basic major.minor compatibility check: dependency's registered version must satisfy "^x.y". */
function versionCompatible(requirement, actualVersion) {
  if (!requirement) return true; // no constraint declared
  if (!actualVersion) return false;
  const norm = (v) => v.replace(/^\^/, '').split('.').map(Number);
  const [reqMajor] = norm(requirement);
  const [actMajor] = norm(actualVersion);
  return reqMajor === actMajor;
}

/**
 * Resolves all dependencies for a capability. Builds a local edge map from the
 * live registry (capability.id -> its own declared deps + every other registered
 * capability's deps) so circular dependencies spanning multiple hops are caught,
 * not just direct self-references.
 *
 * Options:
 *  - timeoutMs: per-dependency lookup timeout (default 2000ms)
 *  - simulatedDelayMs: artificial delay per lookup, for timeout testing
 */
async function resolveDependencies(capability, { timeoutMs = 2000, simulatedDelayMs = 0 } = {}) {
  const registry = persistence.loadRegistry();
  const edges = {};
  for (const [id, meta] of Object.entries(registry.capabilities)) {
    edges[id] = meta.dependencies || [];
  }
  edges[capability.id] = (capability.dependencies || []).map((d) => d.id);

  const resolved = [];
  const missing = [];
  const incompatibleVersions = [];
  const failed = [];

  for (const dep of capability.dependencies || []) {
    try {
      const entry = await withTimeout(
        lookupRegistryEntry(dep.id, { simulatedDelayMs }),
        timeoutMs,
        new DependencyTimeoutError(dep.id)
      );

      if (!entry) {
        missing.push(dep.id);
        resolved.push({ ...dep, resolutionStatus: 'Missing' });
        continue;
      }

      if (dep.versionRequirement && !versionCompatible(dep.versionRequirement, entry.version)) {
        incompatibleVersions.push(dep.id);
        resolved.push({ ...dep, resolutionStatus: 'Incompatible Version', registeredVersion: entry.version });
        continue;
      }

      resolved.push({ ...dep, resolutionStatus: 'Verified', registeredVersion: entry.version });
    } catch (err) {
      failed.push({ id: dep.id, error: err.message });
      resolved.push({ ...dep, resolutionStatus: 'Failed', error: err.message });
    }
  }

  const cycle = detectCircular(capability.id, edges);

  return {
    resolved,
    missing,
    incompatibleVersions,
    failed,
    circular: cycle,
  };
}

/**
 * Evaluates the overall readiness state from the pipeline's checks so far.
 * Precedence matters: a missing validation reference always wins (nothing downstream
 * matters if we can't even trust the capability arrived validated), then structural
 * problems (circular / incompatible versions -> Blocked), then missing data,
 * then execution failures, then the testing-completeness signal from the submitter.
 */
function evaluateReadiness(capability, depResolution) {
  const vr = capability.validationReference;
  if (!vr || !vr.reportId || !vr.validator || !vr.date) {
    return 'Validation Reference Missing';
  }
  if (depResolution.circular) {
    return 'Blocked';
  }
  if (depResolution.incompatibleVersions.length > 0) {
    return 'Blocked';
  }
  if (depResolution.missing.length > 0) {
    return 'Dependency Missing';
  }
  if (depResolution.failed.length > 0) {
    return 'Failed';
  }
  if (capability.fullyTested === true) {
    return 'Ready';
  }
  if (capability.requiresRevision === true) {
    return 'Requires Revision';
  }
  return 'Conditionally Ready';
}

module.exports = {
  DependencyTimeoutError,
  withTimeout,
  lookupRegistryEntry,
  detectCircular,
  versionCompatible,
  resolveDependencies,
  evaluateReadiness,
};

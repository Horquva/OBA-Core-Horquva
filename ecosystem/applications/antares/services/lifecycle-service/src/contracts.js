'use strict';

/**
 * contracts.js
 * ------------
 * The Day 1 System Map (Output -> Contract -> Consumer) is turned into
 * machine-checkable rules here. Each platform has a defined list of
 * the ONLY platforms it may depend on. If a job depends on something
 * outside its contract (e.g. Technology Intelligence directly
 * depending on Capability Operationalization — skipping the entire
 * chain in between), `checkAllContracts` catches it.
 *
 * This is the "who can talk to whom" rule-book — exactly what was in
 * the Day 1 System Map, just enforceable now.
 */

const CONTRACTS = {
  'tech-intel': [], // root source — depends on nothing
  'future-signal': ['tech-intel'],
  'org-futures': ['future-signal', 'tech-intel'],
  'trust-gov': ['org-futures'],
  'cap-validation': ['org-futures', 'trust-gov', 'future-signal'],
  'future-org': ['cap-validation', 'trust-gov', 'cap-ops'],
  'aiml-intel': ['future-org'], // internal to Zeeshan's platform
  'enterprise-validation': ['cap-validation'],
  'knowledge-ops': ['enterprise-validation'],
  'cap-ops': ['knowledge-ops'],
  'eng-ops': [], // observability only — not part of the capability chain
};

/** Checks ONE job's dependencies against its platform's contract. */
function checkJobContract(engine, job) {
  const allowed = CONTRACTS[job.platformId];
  if (allowed === undefined) {
    return { valid: true, violations: [] }; // unknown/custom platform — not our contract to enforce
  }
  const violations = [];
  for (const depId of job.dependsOn) {
    const dep = engine.jobs.get(depId);
    if (!dep) continue; // missing dependency is caught elsewhere (quality gate)
    if (!allowed.includes(dep.platformId)) {
      violations.push(
        `${job.id} (${job.platformId}) illegally depends on ${depId} (${dep.platformId}) — contract only allows: [${allowed.join(', ') || 'nothing'}]`
      );
    }
  }
  return { valid: violations.length === 0, violations };
}

/** Checks EVERY job currently in the engine against its platform's contract. */
function checkAllContracts(engine) {
  const violations = [];
  for (const job of engine.jobs.values()) {
    const result = checkJobContract(engine, job);
    violations.push(...result.violations);
  }
  return { valid: violations.length === 0, violations };
}

module.exports = { CONTRACTS, checkJobContract, checkAllContracts };

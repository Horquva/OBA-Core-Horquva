'use strict';

/**
 * contracts.js
 * ------------
 * Din 1 ke System Map (Output -> Contract -> Consumer) ko yahan
 * machine-checkable rules mein badla gaya hai. Har platform ke liye
 * define hai — wo SIRF kis platform (platforms) se depend ho sakta hai.
 * Agar koi job apne contract se bahar ki cheez par depend kar le
 * (jaise Technology Intelligence directly Capability Operationalization
 * par depend kar jaye — ye galat hai, beech ki poori chain skip ho
 * gayi), to `checkAllContracts` isay pakad lega.
 *
 * Ye "kaun kis se baat kar sakta hai" ka rule-book hai — bilkul jaisa
 * Din 1 ke System Map mein tha, ab bas enforceable hai.
 */

const CONTRACTS = {
  'tech-intel': [], // root source — kisi par depend nahi karta
  'future-signal': ['tech-intel'],
  'org-futures': ['future-signal', 'tech-intel'],
  'trust-gov': ['org-futures'],
  'cap-validation': ['org-futures', 'trust-gov', 'future-signal'],
  'future-org': ['cap-validation', 'trust-gov', 'cap-ops'],
  'aiml-intel': ['future-org'], // Zeeshan ke platform ke andar hi
  'enterprise-validation': ['cap-validation'],
  'knowledge-ops': ['enterprise-validation'],
  'cap-ops': ['knowledge-ops'],
  'eng-ops': [], // sirf observe karta hai, kisi capability-chain ka hissa nahi
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

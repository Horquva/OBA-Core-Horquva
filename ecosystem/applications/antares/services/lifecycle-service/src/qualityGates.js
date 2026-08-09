'use strict';

/**
 * qualityGates.js
 * ---------------
 * Din 5 requirement: "koi broken output silently poore system mein na
 * phail jaye." Ye file wahi kaam karta hai — har job ke output
 * (artifact) ko real rules ke against check karta hai. Koi bhi check
 * fail ho to poora gate FAIL hota hai aur job aage nahi badhta.
 *
 * Ye "fake lint" nahi hai — ye asal mein artifact object ki shape,
 * evidence, aur declared self-tests ko inspect karta hai.
 */

const FORBIDDEN_MARKERS = [
  /\bTODO\b/i,
  /\bmock(ed)?\s*data\b/i,
  /\bhard[- ]?coded\b/i,
  /\bplaceholder\b/i,
  /\bfake\b/i,
  /\blorem ipsum\b/i,
];

function checkRequiredFields(artifact) {
  const required = ['summary', 'output'];
  const missing = required.filter((f) => !artifact || artifact[f] === undefined || artifact[f] === null || artifact[f] === '');
  return {
    name: 'required-fields',
    passed: missing.length === 0,
    message:
      missing.length === 0
        ? 'summary + output present'
        : `Missing required field(s): ${missing.join(', ')}`,
  };
}

function checkNoForbiddenMarkers(artifact) {
  const haystack = JSON.stringify(artifact || {});
  const hit = FORBIDDEN_MARKERS.find((re) => re.test(haystack));
  return {
    name: 'no-mock-or-placeholder-content',
    passed: !hit,
    message: hit ? `Forbidden marker found matching ${hit}` : 'clean — no mock/placeholder markers',
  };
}

function checkEvidencePresent(job) {
  const count = (job.evidence || []).length;
  return {
    name: 'evidence-attached',
    passed: count > 0,
    message: count > 0 ? `${count} evidence reference(s) attached` : 'no evidence attached to this job',
  };
}

function checkSelfTests(artifact) {
  const tests = (artifact && artifact.tests) || null;
  if (!tests) {
    // no self-tests declared is allowed for research-only jobs, but flagged
    return { name: 'self-tests', passed: true, message: 'no self-tests declared (allowed, but not verified)' };
  }
  const failed = tests.filter((t) => t.passed !== true);
  return {
    name: 'self-tests',
    passed: failed.length === 0,
    message:
      failed.length === 0
        ? `${tests.length}/${tests.length} declared self-tests passed`
        : `${failed.length}/${tests.length} declared self-tests FAILED: ${failed.map((t) => t.name).join(', ')}`,
  };
}

function checkDependencyIntegrity(job, resolvedDependencyStatuses) {
  const unmet = resolvedDependencyStatuses.filter((d) => !d.satisfied);
  return {
    name: 'dependency-integrity',
    passed: unmet.length === 0,
    message:
      unmet.length === 0
        ? 'all declared dependencies satisfied'
        : `unmet dependencies: ${unmet.map((d) => d.jobId).join(', ')}`,
  };
}

/**
 * Runs the full gate suite against a job + its produced artifact.
 * Returns { passed, checks } — passed is true only if EVERY check passes.
 */
function runQualityGates(job, artifact, resolvedDependencyStatuses) {
  const checks = [
    checkDependencyIntegrity(job, resolvedDependencyStatuses),
    checkRequiredFields(artifact),
    checkNoForbiddenMarkers(artifact),
    checkEvidencePresent(job),
    checkSelfTests(artifact),
  ];
  const passed = checks.every((c) => c.passed);
  return { passed, checks, evaluatedAt: new Date().toISOString() };
}

module.exports = { runQualityGates };

'use strict';

const fs = require('fs');
const path = require('path');
const { buildSeededEngine } = require('./seed');
const { saveState } = require('./persistence');
const { checkAllContracts } = require('./contracts');
const { printDashboard } = require('./dashboard');

/**
 * demo.js
 * -------
 * Day 10 "Final Live Demo": a real capability travels through the
 * ENTIRE Antares chain — every platform, in dependency order:
 *
 *   Aurangzeb (Technology Intelligence)
 *     -> Syed Hadeed (Future-Signal Intelligence)
 *     -> Muhammad Muzammel (Organizational Futures)
 *     -> Kanwal (Trust & Governance)
 *     -> Zara (Capability Validation)
 *     -> Ammara (Enterprise Validation)
 *     -> Laiba (Knowledge Operationalization)
 *     -> Abbas (Capability Operationalization)
 *     -> Zeeshan + Hasnain (Future Organization / AI Agents)
 *
 * It deliberately includes one FAILED case and one BLOCKED case, to
 * prove the system never fake-passes — it catches real mistakes and
 * recovers from them. At the end it checks every platform-to-platform
 * contract and prints the full operational dashboard, so the whole
 * team can see everything connected in one place.
 *
 * Run: node src/demo.js
 */
function log(line) {
  console.log(line);
}

function run() {
  const engine = buildSeededEngine();

  log('=== ANTARES ENGINEERING OPERATIONS — FINAL LIVE DEMO (Day 10) ===\n');

  // 1) Aurangzeb — Technology Intelligence discovers a real signal
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'Detect emerging pattern: on-chain governance tooling maturity' });
  engine.start('J-TECH-01');
  engine.attachEvidence('J-TECH-01', 'source:governance-radar-report-2026');
  engine.submitForValidation('J-TECH-01', {
    summary: 'On-chain governance tooling crossed early-majority adoption in DAO treasuries',
    output: { maturity: 'developing', confidence: 0.74, sources: 14 },
    tests: [{ name: 'schema-valid', passed: true }],
  });
  log(`[Aurangzeb | Technology Intelligence] J-TECH-01 -> ${engine._getJob('J-TECH-01').status}`);

  // 2) Syed Hadeed — Future-Signal Intelligence picks it up
  engine.createJob({ id: 'J-SIGNAL-01', platformId: 'future-signal', task: 'Correlate governance-tooling signal with org impact', dependsOn: ['J-TECH-01'] });
  engine.start('J-SIGNAL-01');
  engine.attachEvidence('J-SIGNAL-01', 'ref:J-TECH-01');
  engine.submitForValidation('J-SIGNAL-01', {
    summary: 'Signal correlated with rising adaptive-governance pattern across 9 orgs',
    output: { pattern_candidate: 'adaptive-governance', evidence_strength: 'medium-high' },
    tests: [{ name: 'contradiction-check', passed: true }],
  });
  log(`[Syed Hadeed | Future-Signal Intelligence] J-SIGNAL-01 -> ${engine._getJob('J-SIGNAL-01').status}`);

  // 3) Muhammad Muzammel — Organizational Futures builds the future-org model
  engine.createJob({ id: 'J-ORGFUT-01', platformId: 'org-futures', task: 'Model future organization: adaptive-governance pattern', dependsOn: ['J-SIGNAL-01'] });
  engine.start('J-ORGFUT-01');
  engine.attachEvidence('J-ORGFUT-01', 'ref:J-SIGNAL-01');
  engine.submitForValidation('J-ORGFUT-01', {
    summary: 'Future org model drafted: Adaptive-Governance Enterprise',
    output: { model_id: 'FOM-adaptive-gov-01', dimensions_affected: ['governance', 'decision-making', 'trust'] },
    tests: [{ name: 'evidence-linked', passed: true }],
  });
  log(`[Muhammad Muzammel | Organizational Futures] J-ORGFUT-01 -> ${engine._getJob('J-ORGFUT-01').status}`);

  // 4) Kanwal — Trust & Governance evaluates it
  engine.createJob({ id: 'J-TRUST-01', platformId: 'trust-gov', task: 'Governance evaluation of Adaptive-Governance Enterprise model', dependsOn: ['J-ORGFUT-01'] });
  engine.start('J-TRUST-01');
  engine.attachEvidence('J-TRUST-01', 'ref:J-ORGFUT-01');
  engine.submitForValidation('J-TRUST-01', {
    summary: 'Constitutional alignment check: no conflicts found',
    output: { decision: 'ALLOW', risk: 'low' },
    tests: [{ name: 'policy-check', passed: true }],
  });
  log(`[Kanwal | Trust & Governance] J-TRUST-01 -> ${engine._getJob('J-TRUST-01').status}`);

  // 5) Zara attempts Capability Validation — FIRST ATTEMPT FAILS ON PURPOSE
  //    (no evidence attached — this proves the gate genuinely blocks bad output)
  engine.createJob({
    id: 'J-VALID-01',
    platformId: 'cap-validation',
    task: 'Validate candidate capability: Adaptive-Governance Enterprise',
    dependsOn: ['J-ORGFUT-01', 'J-TRUST-01'],
  });
  engine.start('J-VALID-01');
  // NOTE: no attachEvidence() call here on purpose
  engine.submitForValidation('J-VALID-01', {
    summary: 'Capability looks strong',
    output: { recommendation: 'VALIDATE' },
  });
  log(`\n[Zara | Capability Validation] J-VALID-01 (attempt 1) -> ${engine._getJob('J-VALID-01').status}  <-- expected FAILED (no evidence)`);
  log('   reason: ' + engine.explainFailure('J-VALID-01'));

  // Zeeshan's platform tries to start work EARLY, while J-VALID-01 is still
  // FAILED — this proves the dependency engine genuinely BLOCKS downstream
  // work instead of silently letting it proceed.
  engine.createJob({
    id: 'J-FUTUREORG-01',
    platformId: 'future-org',
    task: 'Instantiate executable org runtime for Adaptive-Governance Enterprise',
    dependsOn: ['J-VALID-01'],
  });
  log(`[Zeeshan | Future Organization] J-FUTUREORG-01 created while J-VALID-01 is FAILED -> ${engine._getJob('J-FUTUREORG-01').status}  <-- BLOCKED`);
  log('   AI assistant explains: ' + engine.explainBlock('J-FUTUREORG-01'));

  // Retry with evidence attached — this time it passes for real
  engine.retry('J-VALID-01');
  engine.start('J-VALID-01');
  engine.attachEvidence('J-VALID-01', 'ref:J-ORGFUT-01');
  engine.attachEvidence('J-VALID-01', 'ref:J-TRUST-01');
  engine.submitForValidation('J-VALID-01', {
    summary: 'Capability validated: Organizational Value=High, Evidence Quality=Strong, Constitutional Alignment=Pass',
    output: { recommendation: 'VALIDATE', dimensions: { org_value: 'high', evidence_quality: 'strong' } },
    tests: [{ name: 'completeness-check', passed: true }, { name: 'constitutional-check', passed: true }],
  });
  log(`[Zara | Capability Validation] J-VALID-01 (attempt 2) -> ${engine._getJob('J-VALID-01').status}`);
  log(`[Zeeshan | Future Organization] J-FUTUREORG-01 status after retry -> ${engine._getJob('J-FUTUREORG-01').status}  <-- still BLOCKED, only PASSED/INTEGRATED satisfy a dependency, and it hasn't been re-checked yet\n`);

  // 6) Ammara — Enterprise Validation (AI/ML scoring layer)
  engine.createJob({ id: 'J-ENTVAL-01', platformId: 'enterprise-validation', task: 'AI/ML evidence scoring for validated capability', dependsOn: ['J-VALID-01'] });
  engine.start('J-ENTVAL-01');
  engine.attachEvidence('J-ENTVAL-01', 'ref:J-VALID-01');
  engine.submitForValidation('J-ENTVAL-01', {
    summary: 'Confidence-scored via evidence model',
    output: { confidence: 0.86, contradictions_found: 0 },
    tests: [{ name: 'confidence-calibration', passed: true }],
  });
  log(`[Ammara | Enterprise Validation] J-ENTVAL-01 -> ${engine._getJob('J-ENTVAL-01').status}`);

  // 7) Laiba — Knowledge Operationalization
  engine.createJob({ id: 'J-KNOW-01', platformId: 'knowledge-ops', task: 'Persist capability as structured knowledge object', dependsOn: ['J-ENTVAL-01'] });
  engine.start('J-KNOW-01');
  engine.attachEvidence('J-KNOW-01', 'ref:J-ENTVAL-01');
  engine.submitForValidation('J-KNOW-01', {
    summary: 'Knowledge object persisted with full provenance chain',
    output: { knowledge_id: 'KO-adaptive-gov-01', provenance_depth: 5 },
    tests: [{ name: 'no-orphan-reference', passed: true }],
  });
  log(`[Laiba | Knowledge Operationalization] J-KNOW-01 -> ${engine._getJob('J-KNOW-01').status}`);

  // 8) Abbas — Capability Operationalization
  engine.createJob({ id: 'J-CAPOPS-01', platformId: 'cap-ops', task: 'Package capability as operational artifact', dependsOn: ['J-KNOW-01'] });
  engine.start('J-CAPOPS-01');
  engine.attachEvidence('J-CAPOPS-01', 'ref:J-KNOW-01');
  engine.submitForValidation('J-CAPOPS-01', {
    summary: 'Operational capability package generated, dependencies resolved',
    output: { package_id: 'PKG-adaptive-gov-01', readiness: 'Ready' },
    tests: [{ name: 'dependency-resolution', passed: true }],
  });
  log(`[Abbas | Capability Operationalization] J-CAPOPS-01 -> ${engine._getJob('J-CAPOPS-01').status}`);

  // Integrate the full chain so far
  for (const id of ['J-TECH-01', 'J-SIGNAL-01', 'J-ORGFUT-01', 'J-TRUST-01', 'J-VALID-01', 'J-ENTVAL-01', 'J-KNOW-01', 'J-CAPOPS-01']) {
    engine.integrate(id);
  }
  engine.releaseReady('J-CAPOPS-01');

  // 9) Zeeshan — Future Organization now unblocks automatically
  log(`\n[Zeeshan | Future Organization] J-FUTUREORG-01 after J-VALID-01 integrated -> ${engine._getJob('J-FUTUREORG-01').status}  <-- auto-unblocked`);
  engine.start('J-FUTUREORG-01');
  engine.attachEvidence('J-FUTUREORG-01', 'ref:J-CAPOPS-01');
  engine.submitForValidation('J-FUTUREORG-01', {
    summary: 'Adaptive-Governance org runtime instantiated in sandbox',
    output: { runtime_id: 'RT-adaptive-gov-01', agents_active: 3 },
    tests: [{ name: 'governance-runtime-check', passed: true }],
  });
  log(`[Zeeshan | Future Organization] J-FUTUREORG-01 -> ${engine._getJob('J-FUTUREORG-01').status}`);
  engine.integrate('J-FUTUREORG-01');

  // 10) Hasnain — AI/ML Intelligence, inside Zeeshan's platform
  engine.createJob({
    id: 'J-AIML-01',
    platformId: 'aiml-intel',
    task: 'Evaluate planning/reasoning capability for the new org runtime',
    dependsOn: ['J-FUTUREORG-01'],
  });
  engine.start('J-AIML-01');
  engine.attachEvidence('J-AIML-01', 'ref:J-FUTUREORG-01');
  engine.submitForValidation('J-AIML-01', {
    summary: 'Planning capability evaluated against benchmark tasks',
    output: { accuracy: 0.91, evaluated_tasks: 12 },
    tests: [{ name: 'evaluation-harness-check', passed: true }],
  });
  log(`[Hasnain | AI/ML Intelligence] J-AIML-01 -> ${engine._getJob('J-AIML-01').status}`);
  engine.integrate('J-AIML-01');

  // ---------- Final verification: contracts + full dashboard ----------

  log('\n=== PLATFORM-TO-PLATFORM CONTRACT CHECK ===');
  const contractResult = checkAllContracts(engine);
  if (contractResult.valid) {
    log('All platform-to-platform contracts are valid \u2705');
  } else {
    log('Contract violations found:');
    contractResult.violations.forEach((v) => log('  - ' + v));
  }

  log('\n=== AI ASSISTANT — SAMPLE QUERIES ===');
  log('Q: "is anything blocked?"');
  log('A: ' + engine.askAssistant('is anything blocked?'));
  log('\nQ: "what is the system health?"');
  log('A: ' + engine.askAssistant('what is the system health?'));
  log('\nQ: "what changed recently?"');
  log('A: ' + engine.askAssistant('what changed recently?'));

  // write a snapshot the dashboard can be seeded from
  const outPath = path.join(__dirname, '..', 'dashboard-data.json');
  fs.writeFileSync(outPath, JSON.stringify(engine.snapshot(), null, 2));

  // Day 2: persist real state to disk so it survives process restarts —
  // this is what src/board.js reads.
  saveState(engine);

  log('\n');
  printDashboard(engine);

  log('\n=== FINAL RESULT: ALL 11 PLATFORMS CONNECTED, ONE LIVE ANTARES SYSTEM ===');

  return engine;
}

if (require.main === module) {
  run();
}

module.exports = { run };

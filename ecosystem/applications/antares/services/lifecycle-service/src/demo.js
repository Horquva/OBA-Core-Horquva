'use strict';

const fs = require('fs');
const path = require('path');
const { buildSeededEngine } = require('./seed');
const { JobStatus } = require('./models');
const { saveState } = require('./persistence');

/**
 * demo.js
 * -------
 * Din 10 "Final Live Demo": ek real capability poore Antares chain se
 * guzarti hai — Technology Intelligence se lekar Capability
 * Operationalization tak. Isme jaan-boojh kar ek FAILED aur ek BLOCKED
 * case bhi dikhaya gaya hai, taake pata chale ke system fake-pass nahi
 * karta — asli galtiyan pakadta hai aur recover karta hai.
 *
 * Run: node src/demo.js
 */
function log(line) {
  console.log(line);
}

function run() {
  const engine = buildSeededEngine();

  log('=== ANTARES ENGINEERING OPERATIONS — LIVE DEMO ===\n');

  // 1) Technology Intelligence discovers a real signal
  engine.createJob({ id: 'J-TECH-01', platformId: 'tech-intel', task: 'Detect emerging pattern: on-chain governance tooling maturity' });
  engine.start('J-TECH-01');
  engine.attachEvidence('J-TECH-01', 'source:governance-radar-report-2026');
  engine.submitForValidation('J-TECH-01', {
    summary: 'On-chain governance tooling crossed early-majority adoption in DAO treasuries',
    output: { maturity: 'developing', confidence: 0.74, sources: 14 },
    tests: [{ name: 'schema-valid', passed: true }],
  });
  log(`J-TECH-01 -> ${engine._getJob('J-TECH-01').status}`);

  // 2) Future-Signal Intelligence picks it up
  engine.createJob({ id: 'J-SIGNAL-01', platformId: 'future-signal', task: 'Correlate governance-tooling signal with org impact', dependsOn: ['J-TECH-01'] });
  engine.start('J-SIGNAL-01');
  engine.attachEvidence('J-SIGNAL-01', 'ref:J-TECH-01');
  engine.submitForValidation('J-SIGNAL-01', {
    summary: 'Signal correlated with rising adaptive-governance pattern across 9 orgs',
    output: { pattern_candidate: 'adaptive-governance', evidence_strength: 'medium-high' },
    tests: [{ name: 'contradiction-check', passed: true }],
  });
  log(`J-SIGNAL-01 -> ${engine._getJob('J-SIGNAL-01').status}`);

  // 3) Organizational Futures builds the future-org model
  engine.createJob({ id: 'J-ORGFUT-01', platformId: 'org-futures', task: 'Model future organization: adaptive-governance pattern', dependsOn: ['J-SIGNAL-01'] });
  engine.start('J-ORGFUT-01');
  engine.attachEvidence('J-ORGFUT-01', 'ref:J-SIGNAL-01');
  engine.submitForValidation('J-ORGFUT-01', {
    summary: 'Future org model drafted: Adaptive-Governance Enterprise',
    output: { model_id: 'FOM-adaptive-gov-01', dimensions_affected: ['governance', 'decision-making', 'trust'] },
    tests: [{ name: 'evidence-linked', passed: true }],
  });
  log(`J-ORGFUT-01 -> ${engine._getJob('J-ORGFUT-01').status}`);

  // 4) Trust & Governance evaluates it
  engine.createJob({ id: 'J-TRUST-01', platformId: 'trust-gov', task: 'Governance evaluation of Adaptive-Governance Enterprise model', dependsOn: ['J-ORGFUT-01'] });
  engine.start('J-TRUST-01');
  engine.attachEvidence('J-TRUST-01', 'ref:J-ORGFUT-01');
  engine.submitForValidation('J-TRUST-01', {
    summary: 'Constitutional alignment check: no conflicts found',
    output: { decision: 'ALLOW', risk: 'low' },
    tests: [{ name: 'policy-check', passed: true }],
  });
  log(`J-TRUST-01 -> ${engine._getJob('J-TRUST-01').status}`);

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
  log(`J-VALID-01 (attempt 1) -> ${engine._getJob('J-VALID-01').status}  <-- expected FAILED (no evidence)`);
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
  log(`\nJ-FUTUREORG-01 created while J-VALID-01 is FAILED -> ${engine._getJob('J-FUTUREORG-01').status}  <-- BLOCKED`);
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
  log(`J-VALID-01 (attempt 2) -> ${engine._getJob('J-VALID-01').status}`);
  log(`J-FUTUREORG-01 status after retry -> ${engine._getJob('J-FUTUREORG-01').status}  <-- still BLOCKED, only PASSED/INTEGRATED satisfy a dependency, and it hasn't been re-checked yet\n`);

  // 6) Ammara — Enterprise Validation (AI/ML scoring layer)
  engine.createJob({ id: 'J-ENTVAL-01', platformId: 'enterprise-validation', task: 'AI/ML evidence scoring for validated capability', dependsOn: ['J-VALID-01'] });
  engine.start('J-ENTVAL-01');
  engine.attachEvidence('J-ENTVAL-01', 'ref:J-VALID-01');
  engine.submitForValidation('J-ENTVAL-01', {
    summary: 'Confidence-scored via evidence model',
    output: { confidence: 0.86, contradictions_found: 0 },
    tests: [{ name: 'confidence-calibration', passed: true }],
  });
  log(`\nJ-ENTVAL-01 -> ${engine._getJob('J-ENTVAL-01').status}`);

  // 7) Laiba — Knowledge Operationalization
  engine.createJob({ id: 'J-KNOW-01', platformId: 'knowledge-ops', task: 'Persist capability as structured knowledge object', dependsOn: ['J-ENTVAL-01'] });
  engine.start('J-KNOW-01');
  engine.attachEvidence('J-KNOW-01', 'ref:J-ENTVAL-01');
  engine.submitForValidation('J-KNOW-01', {
    summary: 'Knowledge object persisted with full provenance chain',
    output: { knowledge_id: 'KO-adaptive-gov-01', provenance_depth: 5 },
    tests: [{ name: 'no-orphan-reference', passed: true }],
  });
  log(`J-KNOW-01 -> ${engine._getJob('J-KNOW-01').status}`);

  // 8) Abbas — Capability Operationalization
  engine.createJob({ id: 'J-CAPOPS-01', platformId: 'cap-ops', task: 'Package capability as operational artifact', dependsOn: ['J-KNOW-01'] });
  engine.start('J-CAPOPS-01');
  engine.attachEvidence('J-CAPOPS-01', 'ref:J-KNOW-01');
  engine.submitForValidation('J-CAPOPS-01', {
    summary: 'Operational capability package generated, dependencies resolved',
    output: { package_id: 'PKG-adaptive-gov-01', readiness: 'Ready' },
    tests: [{ name: 'dependency-resolution', passed: true }],
  });
  log(`J-CAPOPS-01 -> ${engine._getJob('J-CAPOPS-01').status}`);

  // Integrate + release-ready the full chain
  for (const id of ['J-TECH-01', 'J-SIGNAL-01', 'J-ORGFUT-01', 'J-TRUST-01', 'J-VALID-01', 'J-ENTVAL-01', 'J-KNOW-01', 'J-CAPOPS-01']) {
    engine.integrate(id);
  }
  engine.releaseReady('J-CAPOPS-01');

  log(`\nJ-FUTUREORG-01 after J-VALID-01 integrated -> ${engine._getJob('J-FUTUREORG-01').status}  <-- auto-unblocked`);
  engine.start('J-FUTUREORG-01');
  engine.attachEvidence('J-FUTUREORG-01', 'ref:J-CAPOPS-01');
  engine.submitForValidation('J-FUTUREORG-01', {
    summary: 'Adaptive-Governance org runtime instantiated in sandbox',
    output: { runtime_id: 'RT-adaptive-gov-01', agents_active: 3 },
    tests: [{ name: 'governance-runtime-check', passed: true }],
  });
  log(`J-FUTUREORG-01 -> ${engine._getJob('J-FUTUREORG-01').status}`);

  log('\n=== SYSTEM HEALTH ===');
  log(JSON.stringify(engine.getSystemHealth(), null, 2));

  log('\n=== AI ASSISTANT — SAMPLE QUERIES ===');
  log('Q: "kya kuch blocked hai?"');
  log('A: ' + engine.askAssistant('kya kuch blocked hai?'));
  log('\nQ: "system health kya hai?"');
  log('A: ' + engine.askAssistant('system health kya hai?'));
  log('\nQ: "recent changes kya hain?"');
  log('A: ' + engine.askAssistant('recent changes kya hain?'));

  // write a snapshot the dashboard can be seeded from
  const outPath = path.join(__dirname, '..', 'dashboard-data.json');
  fs.writeFileSync(outPath, JSON.stringify(engine.snapshot(), null, 2));
  log(`\nSnapshot written to ${outPath}`);

  // Din 2: persist real state to disk so it survives process restarts —
  // this is what src/board.js reads.
  const storePath = saveState(engine);
  log(`Persistent state saved to ${storePath}`);
  log('Ab "node src/board.js" chalao — status board isi saved data se banega.');

  return engine;
}

if (require.main === module) {
  run();
}

module.exports = { run };

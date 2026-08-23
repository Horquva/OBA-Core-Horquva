'use strict';

/**
 * Din 10 — Final Demo.
 * Submits one validated capability through the full pipeline, shows dependency
 * resolution against a real dependency (COP-0001), shows readiness evaluation,
 * builds the operational package, then simulates a downstream consumer
 * discovering it purely by readiness state (no manual copying).
 *
 * Run: node demo.js   (after `node seed.js`)
 */

const { runPipeline } = require('./src/pipeline');
const persistence = require('./src/persistence');

async function main() {
  console.log('--- Step 1: submit a new validated capability that depends on COP-0001 ---\n');

  const incoming = {
    id: 'COP-0005',
    name: 'Automated Contract Clause Extractor',
    purpose: 'Extracts key obligation clauses from vendor contracts for faster legal review.',
    validationReference: { reportId: 'EV-2026-031', validator: 'Zara Fatima', date: 'Aug 2026' },
    inputs: ['Vendor contract PDFs'],
    outputs: ['Extracted obligation clauses with page references'],
    dependencies: [{ id: 'COP-0001', type: 'capability' }],
    fullyTested: false,
    submittedBy: 'zara-capability-validation',
    authToken: 'zara-cvp-token-2026',
  };

  const result = await runPipeline(incoming);

  if (result.errors.length > 0) {
    console.log('Pipeline stopped early:', result.errors);
    return;
  }

  console.log(`Capability ${result.capability.id} processed.`);
  console.log(`Readiness state: ${result.capability.readinessState}`);
  console.log(`Dependency resolution:`, JSON.stringify(result.capability.dependencies, null, 2));
  console.log(`\nLifecycle transitions:`);
  result.capability.lifecycleTransitions.forEach((t) =>
    console.log(`  ${t.date}  ${t.from || '(start)'} -> ${t.to}   (${t.note})`)
  );

  console.log('\n--- Step 2: operational package produced for downstream consumers ---\n');
  console.log(JSON.stringify(result.package, null, 2));

  console.log('\n--- Step 3: a downstream consumer discovers it by readiness state (no manual copying) ---\n');
  const consumable = persistence.findByReadiness(['Ready', 'Conditionally Ready']);
  console.log(`Consumer query: "give me everything Ready or Conditionally Ready" ->`);
  consumable.forEach((c) => console.log(`  - ${c.id}: ${c.name} [${c.readinessState}]`));
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});

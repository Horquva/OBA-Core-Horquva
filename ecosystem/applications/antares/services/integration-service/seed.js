'use strict';

/**
 * Seeds the registry with the 4 capabilities already reviewed (COP-0001..0004),
 * so the dependency engine has something real to resolve against instead of an
 * empty registry. Run once: `node seed.js`
 */

const fs = require('fs');
const persistence = require('./src/persistence');

// Wipe any previous run so seeding is idempotent.
fs.rmSync(persistence.RECORDS_DIR, { recursive: true, force: true });
fs.rmSync(persistence.REGISTRY_PATH, { force: true });
persistence.ensureDirs();

function seedRegistered(capability) {
  const registered = persistence.register(capability);
  registered.readinessState = capability.readinessState;
  persistence.persist(registered);
}

seedRegistered({
  id: 'COP-0001',
  name: 'Automated Compliance Risk Scoring',
  version: '0.1',
  purpose: 'Flags policy sections that may conflict with new regulations.',
  validationReference: { reportId: 'EV-2026-014', validator: 'Zara Fatima', date: 'July 2026' },
  inputs: ['Internal policy documents', 'Regulatory database feed'],
  outputs: ['Per-clause risk level with conflicting clause'],
  dependencies: [],
  readinessState: 'Conditionally Ready',
  fullyTested: false,
});

seedRegistered({
  id: 'COP-0002',
  name: 'Automated Vendor Risk Assessment',
  version: '0.1',
  purpose: 'Scores third-party vendor risk across financial, operational, compliance factors.',
  validationReference: { reportId: 'EV-2026-021', validator: 'Zara Fatima', date: 'July 2026' },
  inputs: ['Vendor database', 'Procurement history', 'Financial disclosure records'],
  outputs: ['Vendor risk score with driver explanation'],
  dependencies: [{ id: 'COP-0001', type: 'capability' }],
  readinessState: 'Conditionally Ready',
  fullyTested: false,
});

seedRegistered({
  id: 'COP-0003',
  name: 'Policy Change Impact Simulator',
  version: '0.1',
  purpose: 'Models downstream impact of a proposed policy change before adoption.',
  validationReference: { reportId: 'EV-2026-024', validator: 'Zara Fatima', date: 'July 2026' },
  inputs: ['Internal process/workflow map', 'Existing policy repository'],
  outputs: ['Simulated downstream impact per team/workflow'],
  dependencies: [],
  readinessState: 'Requires Revision',
  requiresRevision: true,
});

seedRegistered({
  id: 'COP-0004',
  name: 'Cross-Department Audit Readiness Checker',
  version: '0.1',
  purpose: "Flags documentation/process gaps ahead of a formal audit.",
  validationReference: { reportId: 'EV-2026-027', validator: 'Zara Fatima', date: 'July 2026' },
  inputs: ["Per-department documentation repository", "Shared audit-standard checklist"],
  outputs: ['Per-department audit-readiness score'],
  dependencies: [{ id: 'COP-0001', type: 'capability' }],
  readinessState: 'Conditionally Ready',
  fullyTested: false,
});

console.log('Seeded COP-0001 through COP-0004 into the registry.');

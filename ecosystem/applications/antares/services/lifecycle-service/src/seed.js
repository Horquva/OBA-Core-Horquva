'use strict';

const { EngineeringOperationsEngine } = require('./engine');

/**
 * seed.js
 * -------
 * Real 10 Antares platforms register hote hain yahan (koi placeholder
 * naam nahi — same log jo Kamil ki team ke roadmap docs mein hain).
 */
function buildSeededEngine() {
  const engine = new EngineeringOperationsEngine();

  const platforms = [
    { id: 'tech-intel', name: 'Technology Intelligence', owner: 'Aurangzeb Malik' },
    { id: 'org-futures', name: 'Organizational Futures Engineering', owner: 'Muhammad Muzammel Aslam' },
    { id: 'future-signal', name: 'Future-Signal Intelligence', owner: 'Syed Hadeed Safdar' },
    { id: 'future-org', name: 'Future Organization Engineering (AI Agents)', owner: 'Zeeshan Farooq' },
    { id: 'aiml-intel', name: 'AI/ML Intelligence (within Future Organization)', owner: 'Muhammad Hasnain Ajmal' },
    { id: 'trust-gov', name: 'Trust & Governance Intelligence', owner: 'Kanwal Raveen' },
    { id: 'cap-validation', name: 'Capability Validation', owner: 'Zara Fatima' },
    { id: 'enterprise-validation', name: 'Enterprise Validation', owner: 'Ammara Nasir' },
    { id: 'knowledge-ops', name: 'Knowledge Operationalization', owner: 'Laiba Mahboob' },
    { id: 'cap-ops', name: 'Capability Operationalization', owner: 'Abbas Raza' },
    { id: 'eng-ops', name: 'Engineering Operations', owner: 'Kamil Ejaz' },
  ];
  for (const p of platforms) engine.registerPlatform(p);

  return engine;
}

module.exports = { buildSeededEngine };

/**
 * CONSTITUTIONAL MODULE CATALOG — Master Registry (M01–M55, LOCKED)
 * ------------------------------------------------------------------
 * Single source of truth for the Organizational Brain's constitutional
 * analyses.
 *
 * ⚠ Four were RETIRED on 2026-08-24, taking the catalog from 55 to 51:
 *   M10 Organizational Memory  — counted intelligence packages on the message bus
 *   M12 Organizational Forecasting — projected entity growth as 1.1 + brain usage
 *   M17 Organizational Learning — learningIndex = min(1, brainRuns / 100)
 *   M47 Continuous Learning — compared confidence across brain runs
 * All four measured the software rather than the organization; M47's own
 * constitutional question was "How does the Brain improve continuously?".
 * Every question they claimed is already answered from real tables by
 * routes/learning (/failures, /decisions — workflow_failures + decision_history),
 * routes/forecast (organizational_forecasts) and routes/memory. Nothing depended
 * on them. See docs/superpowers/specs/2026-08-24-brain-as-library-design.md §6.1.
 *
 * ⚠ A further 27 were RETIRED on 2026-09-02, taking the catalog from 51 to 24:
 *   M05 M06 M08 M09 M11 M13 M14 M15 M16 M21 M22 M23 M24 M25 M26 M27 M33 M36
 *   M38 M46 M48 M50 M51 M52 M53 M54 M55
 * Each was audited against the live SQL / domain/derived.js system already
 * answering the same-sounding question and found redundant with something
 * richer and already shipping — verified by reading both implementations,
 * not just matching names (e.g. M11's crude likelihood formula vs
 * derived.js's predictiveRisk(), the codebase's own canonical definition;
 * M16's dependency-count readiness vs orchestration.js's real actor-collision
 * detection). M52/M53 duplicated other BRAIN modules (M19, M18) rather than
 * SQL — the catalog had internal duplication too. The M46→M48→M55 chain
 * (Truth gates Advisor, Meta-Brain fuses last) is retired as a public-facing
 * surface because all three stages already have richer live answers
 * (truth.js's real claims-verification system, M04's recommendation engine,
 * and two existing fusion systems — orchestrator.js and brainCore.js) — not
 * because verification/advice/fusion aren't real questions. Both retirement
 * passes are recoverable from git.
 *
 * ⚠ One more, M30 Knowledge Concentration, was found the same way later the
 * same day while auditing the remaining 24 for live wiring (see
 * modules/implementations.js's header) and RETIRED on 2026-09-02, taking the
 * catalog from 24 to 23. Its `ownershipConcentration()` (a flat count of
 * assets per owner) is a strictly weaker duplicate of derived.js's
 * knowledgeConcentration() — criticality-WEIGHTED, already live at
 * GET /api/knowledge/intelligence (routes/knowledge/intelligence.js) — the
 * exact question M30 asks ("Where is knowledge dangerously concentrated?"),
 * already answered richer.
 *
 * The remaining definitions are locked: no renaming, merging, or
 * duplication. Ownership reflects the MVP Execution Guides (constitutional
 * engineering assignment); module names reflect the locked Master Registry.
 *
 * Each entry:
 *   code      — M01..M55 (constitutional identifier, immutable)
 *   name      — locked constitutional name
 *   owner     — architectural owner (engineer)
 *   layer     — reality | prediction | reasoning | executive
 *   question  — the constitutional question the module answers
 *   version   — semantic version of the module contract
 *   dependsOn — module codes that must execute / register before this one
 *   consumers — module codes that consume this module's intelligence
 *   capabilities — constitutional services this module exposes
 */

// Layer constants (used by Ontology + Runtime scheduling)
const LAYER = {
  REALITY: 'reality',       // discovery / knowledge foundation (Huzaifa)
  PREDICTION: 'prediction', // prediction / learning / digital twin (Tahir)
  REASONING: 'reasoning',   // reasoning / orchestration / meta-brain (Kamran)
  EXECUTIVE: 'executive',   // executive experience / automation (Anusha)
}

/**
 * Curated dependency map. Only the constitutionally significant dependencies
 * are declared here; everything else resolves to []. These drive the
 * dependency-ordering topological sort.
 */
const DEPENDENCIES = {
  M02: ['M01'],            // Dependency needs Ownership
  M03: ['M01', 'M02'],     // Risk needs Ownership + Dependency
  M19: ['M01', 'M20'],     // Governance needs Ownership + Accountability
  M20: ['M01'],            // Accountability needs Ownership
  M28: ['M02', 'M34'],     // Universal Dependency Graph needs Dependency + Hidden Dependency
  M29: ['M01', 'M28'],     // Relationship Intelligence needs Ownership + Dependency Graph
  M31: ['M28', 'M29'],     // Ecosystem needs graphs
  M34: ['M02'],            // Hidden Dependency needs Dependency
  M35: ['M28', 'M29'],     // Network needs graph + relationships
  M49: ['M28', 'M29', 'M31'], // Digital Twin needs full graph
}

// [code, name, owner, layer, constitutional question]
const RAW = [
  ['M01', 'Ownership Intelligence', 'Huzaifa', LAYER.REALITY, 'Who owns what across the organization?'],
  ['M02', 'Dependency Intelligence', 'Huzaifa', LAYER.REALITY, 'What depends on what?'],
  ['M03', 'Risk Intelligence', 'Huzaifa', LAYER.REALITY, 'Where is the organization vulnerable?'],
  ['M04', 'Recommendation Engine', 'Kamran', LAYER.REASONING, 'What should be done next?'],
  ['M07', 'AI Tool Intelligence', 'Huzaifa', LAYER.REALITY, 'Which AI tools exist and how are they governed?'],
  ['M18', 'Organizational Continuity Intelligence', 'Kamran', LAYER.REASONING, 'Can the organization survive disruption?'],
  ['M19', 'Governance Intelligence', 'Huzaifa', LAYER.REALITY, 'How is the organization governed?'],
  ['M20', 'Accountability Intelligence', 'Huzaifa', LAYER.REALITY, 'Who is accountable for what?'],
  ['M28', 'Universal Dependency Graph', 'Huzaifa', LAYER.REALITY, 'How is everything connected as one dependency network?'],
  ['M29', 'Organizational Relationship Intelligence', 'Huzaifa', LAYER.REALITY, 'How strong and healthy are organizational relationships?'],
  ['M31', 'Organizational Ecosystem Intelligence', 'Huzaifa', LAYER.REALITY, 'What is the full internal and external ecosystem?'],
  ['M32', 'Dependency Impact Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the impact if a dependency fails?'],
  ['M34', 'Hidden Dependency Intelligence', 'Huzaifa', LAYER.REALITY, 'What dependencies are undocumented but real?'],
  ['M35', 'Organizational Network Intelligence', 'Huzaifa', LAYER.REALITY, 'Who are the central actors and information pathways?'],
  ['M37', 'Pattern Intelligence', 'Tahir', LAYER.PREDICTION, 'What recurring patterns exist?'],
  ['M39', 'Capability Intelligence', 'Kamran', LAYER.REASONING, 'What capabilities does the organization have?'],
  ['M40', 'Strategic Alignment Intelligence', 'Kamran', LAYER.REASONING, 'Is execution aligned with strategy?'],
  ['M41', 'Organizational DNA Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the organization\'s core identity?'],
  ['M42', 'Culture Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the organizational culture?'],
  ['M43', 'Organizational Maturity Intelligence', 'Tahir', LAYER.PREDICTION, 'How mature is the organization?'],
  ['M44', 'Organizational Behavior Intelligence', 'Tahir', LAYER.PREDICTION, 'How does the organization behave?'],
  ['M45', 'Benchmark Intelligence', 'Tahir', LAYER.PREDICTION, 'How does the organization compare?'],
  ['M49', 'Digital Twin Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the live virtual model of the organization?'],
]

function slug(name) {
  return name.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
}

const MODULES = RAW.map(([code, name, owner, layer, question]) => {
  const capabilityId = `${code.toLowerCase()}.${slug(name)}`
  return {
    code,
    name,
    // A readable alias derived from the name, so callers can say
    // brain.run('culture') instead of brain.run('M42'). The code stays the
    // canonical id — it is what dependsOn and the ordering rules key on — but
    // route files read far better with the slug. Verified collision-free.
    slug: name
      .replace(/\s*Intelligence\s*/g, ' ')
      .replace(/\(.*?\)/g, '')
      .trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    owner,
    layer,
    question,
    version: '1.0.0',
    status: 'implemented',
    dependsOn: DEPENDENCIES[code] || [],
    capabilities: [
      {
        id: capabilityId,
        name,
        description: question,
        inputs: ['organizational-context'],
        outputs: ['intelligence-package'],
      },
    ],
  }
})

// Derive consumers from dependsOn (reverse edges)
for (const m of MODULES) {
  m.consumers = MODULES.filter((x) => x.dependsOn.includes(m.code)).map((x) => x.code)
}

module.exports = { MODULES, LAYER }

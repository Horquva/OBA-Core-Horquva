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
 * Recoverable from git.
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
 * are declared here; everything else resolves to []. These drive the Execution
 * Engine's topological ordering and the "Truth gates Advisor / Orchestrator
 * runs last" constitutional rules.
 */
const DEPENDENCIES = {
  M02: ['M01'],            // Dependency needs Ownership
  M03: ['M01', 'M02'],     // Risk needs Ownership + Dependency
  M14: ['M01', 'M03'],     // Decision Intelligence needs Ownership + Risk
  M19: ['M01', 'M20'],     // Governance needs Ownership + Accountability
  M20: ['M01'],            // Accountability needs Ownership
  M28: ['M02', 'M34'],     // Universal Dependency Graph needs Dependency + Hidden Dependency
  M29: ['M01', 'M28'],     // Relationship Intelligence needs Ownership + Dependency Graph
  M31: ['M28', 'M29'],     // Ecosystem needs graphs
  M34: ['M02'],            // Hidden Dependency needs Dependency
  M35: ['M28', 'M29'],     // Network needs graph + relationships
  M11: ['M02', 'M03', 'M28'], // Predictive Risk grounded in reality
  M24: ['M01', 'M02', 'M03', 'M46'], // Decision Support needs reality + Truth
  M46: ['M01', 'M02', 'M03', 'M19', 'M20'], // Truth verifies reality
  M48: ['M46'],            // Autonomous Advisor gated by Truth
  M49: ['M28', 'M29', 'M31'], // Digital Twin needs full graph
  M50: ['M46', 'M24'],     // Brain Core Logic
  M54: ['M05', 'M49'],     // Simulation Universe
  M55: ['M46', 'M48', 'M50', 'M25'], // Meta-Brain Orchestrator (runs last)
  M22: ['M01', 'M29', 'M19'], // Voice/OBA retrieves ownership/relationship/governance
  M23: ['M25', 'M46', 'M48', 'M11'], // Executive Briefing
  M16: ['M08'],            // Workflow Orchestration needs Workflow Intelligence
  M51: ['M03', 'M18'],     // Self-Healing
  M52: ['M19'],            // Governance Automation
  M53: ['M18'],            // Continuity Automation
}

// [code, name, owner, layer, constitutional question]
const RAW = [
  ['M01', 'Ownership Intelligence', 'Huzaifa', LAYER.REALITY, 'Who owns what across the organization?'],
  ['M02', 'Dependency Intelligence', 'Huzaifa', LAYER.REALITY, 'What depends on what?'],
  ['M03', 'Risk Intelligence', 'Huzaifa', LAYER.REALITY, 'Where is the organization vulnerable?'],
  ['M04', 'Recommendation Engine', 'Kamran', LAYER.REASONING, 'What should be done next?'],
  ['M05', 'What-If Simulation Engine', 'Kamran', LAYER.REASONING, 'What happens if we change something?'],
  ['M06', 'Human-Agent Dependency Map', 'Kamran', LAYER.REASONING, 'How do humans and AI agents depend on each other?'],
  ['M07', 'AI Tool Intelligence', 'Huzaifa', LAYER.REALITY, 'Which AI tools exist and how are they governed?'],
  ['M08', 'Workflow Intelligence', 'Huzaifa', LAYER.REALITY, 'How does work actually flow?'],
  ['M09', 'Knowledge Risk Intelligence', 'Kamran', LAYER.REASONING, 'Where is critical knowledge concentrated or at risk?'],
  ['M11', 'Predictive Risk Intelligence', 'Tahir', LAYER.PREDICTION, 'Which risks are likely to materialize?'],
  ['M13', 'Human-AI Collaboration Intelligence', 'Tahir', LAYER.PREDICTION, 'How well do humans and AI collaborate?'],
  ['M14', 'Decision Intelligence', 'Kamran', LAYER.REASONING, 'How are decisions made and with what quality?'],
  ['M15', 'Verification Intelligence', 'Anusha', LAYER.EXECUTIVE, 'Is this intelligence verified and trustworthy?'],
  ['M16', 'Workflow Orchestration Intelligence', 'Anusha', LAYER.EXECUTIVE, 'How should workflows be coordinated and automated?'],
  ['M18', 'Organizational Continuity Intelligence', 'Kamran', LAYER.REASONING, 'Can the organization survive disruption?'],
  ['M19', 'Governance Intelligence', 'Huzaifa', LAYER.REALITY, 'How is the organization governed?'],
  ['M20', 'Accountability Intelligence', 'Huzaifa', LAYER.REALITY, 'Who is accountable for what?'],
  ['M21', 'Executive Avatar Intelligence', 'Anusha', LAYER.EXECUTIVE, 'How does the executive appear and interact?'],
  ['M22', 'Voice Intelligence Engine', 'Huzaifa', LAYER.REALITY, 'How is natural language turned into constitutional execution?'],
  ['M23', 'Executive Briefing Intelligence', 'Anusha', LAYER.EXECUTIVE, 'What must the executive know right now?'],
  ['M24', 'Decision Support Intelligence', 'Kamran', LAYER.REASONING, 'What supports this decision with evidence?'],
  ['M25', 'Organizational Health Intelligence', 'Kamran', LAYER.REASONING, 'How healthy is the organization?'],
  ['M26', 'Executive Memory Intelligence', 'Kamran', LAYER.REASONING, 'What should the executive remember?'],
  ['M27', 'Executive Context Intelligence', 'Kamran', LAYER.REASONING, 'What is the executive context for this request?'],
  ['M28', 'Universal Dependency Graph', 'Huzaifa', LAYER.REALITY, 'How is everything connected as one dependency network?'],
  ['M29', 'Organizational Relationship Intelligence', 'Huzaifa', LAYER.REALITY, 'How strong and healthy are organizational relationships?'],
  ['M30', 'Knowledge Concentration Intelligence', 'Kamran', LAYER.REASONING, 'Where is knowledge dangerously concentrated?'],
  ['M31', 'Organizational Ecosystem Intelligence', 'Huzaifa', LAYER.REALITY, 'What is the full internal and external ecosystem?'],
  ['M32', 'Dependency Impact Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the impact if a dependency fails?'],
  ['M33', 'Dependency Evolution Intelligence', 'Tahir', LAYER.PREDICTION, 'How are dependencies changing over time?'],
  ['M34', 'Hidden Dependency Intelligence', 'Huzaifa', LAYER.REALITY, 'What dependencies are undocumented but real?'],
  ['M35', 'Organizational Network Intelligence', 'Huzaifa', LAYER.REALITY, 'Who are the central actors and information pathways?'],
  ['M36', 'Signal Intelligence', 'Kamran', LAYER.REASONING, 'What signals matter across the organization?'],
  ['M37', 'Pattern Intelligence', 'Tahir', LAYER.PREDICTION, 'What recurring patterns exist?'],
  ['M38', 'Opportunity Intelligence', 'Kamran', LAYER.REASONING, 'Where are the opportunities?'],
  ['M39', 'Capability Intelligence', 'Kamran', LAYER.REASONING, 'What capabilities does the organization have?'],
  ['M40', 'Strategic Alignment Intelligence', 'Kamran', LAYER.REASONING, 'Is execution aligned with strategy?'],
  ['M41', 'Organizational DNA Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the organization\'s core identity?'],
  ['M42', 'Culture Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the organizational culture?'],
  ['M43', 'Organizational Maturity Intelligence', 'Tahir', LAYER.PREDICTION, 'How mature is the organization?'],
  ['M44', 'Organizational Behavior Intelligence', 'Tahir', LAYER.PREDICTION, 'How does the organization behave?'],
  ['M45', 'Benchmark Intelligence', 'Tahir', LAYER.PREDICTION, 'How does the organization compare?'],
  ['M46', 'Truth Intelligence', 'Kamran', LAYER.REASONING, 'What organizational truth can be trusted? (gates M48)'],
  ['M48', 'Autonomous Advisor', 'Kamran', LAYER.REASONING, 'What does the Brain autonomously advise? (gated by M46)'],
  ['M49', 'Digital Twin Intelligence', 'Tahir', LAYER.PREDICTION, 'What is the live virtual model of the organization?'],
  ['M50', 'Organizational Brain Core Logic', 'Kamran', LAYER.REASONING, 'What is the core reasoning of the Brain?'],
  ['M51', 'Self-Healing Intelligence', 'Anusha', LAYER.EXECUTIVE, 'How does the organization detect and heal issues?'],
  ['M52', 'Governance Automation Intelligence', 'Anusha', LAYER.EXECUTIVE, 'How is governance enforced automatically?'],
  ['M53', 'Continuity Automation Intelligence', 'Anusha', LAYER.EXECUTIVE, 'How is continuity recovery automated?'],
  ['M54', 'Simulation Universe', 'Kamran', LAYER.REASONING, 'What happens across many simulated futures?'],
  ['M55', 'Organizational Intelligence Orchestrator (Meta-Brain)', 'Kamran', LAYER.REASONING, 'How does all intelligence fuse into one answer? (runs last)'],
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

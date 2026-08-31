const express = require('express')
const router = express.Router()

// Supabase is optional — the engine works fully from the inline brain
// even when the database is empty or unreachable (serverless cold start).
let supabase = null
try { supabase = require('../../supabase') } catch (_) { supabase = null }

// ─────────────────────────────────────────────
// INLINE ORGANIZATIONAL BRAIN (demo-safe knowledge)
// Consistent with the Daily Briefing so OBA always "knows" the org.
// ─────────────────────────────────────────────

const BRAIN = {
  org: {
    intelligenceScore: 62,
    rating: 'Moderate',
    docCoverage: 48.1,
    docThreshold: 60,
    pendingDecisions: 7,
    spof: 'SecurityScanner',
    failing: 'KnowledgeIndexer',
  },
  people: [
    { name: 'Yuki Tanaka',    department: 'Platform Engineering', role: 'Senior SRE',         dependencyScore: 82, criticalAgents: 5 },
    { name: 'Nathan Wright',  department: 'Data Engineering',     role: 'Lead Data Engineer', dependencyScore: 71, criticalAgents: 3 },
    { name: 'Priya Sharma',   department: 'Security',             role: 'Security Lead',      dependencyScore: 58, criticalAgents: 2 },
    { name: 'Diego Martinez', department: 'DevOps',               role: 'DevOps Engineer',    dependencyScore: 49, criticalAgents: 2 },
    { name: 'Aisha Khan',     department: 'Product Operations',   role: 'Incident Manager',   dependencyScore: 44, criticalAgents: 1 },
  ],
  agents: [
    { name: 'SecurityScanner',   type: 'agent', status: 'active', risk: 'critical', riskScore: 88, threatLevel: 'CRITICAL', owner: 'Priya Sharma',   department: 'Security',           backup: null,             documented: false, emerging: true,  reasons: ['no backup owner — single point of failure', 'runs sensitive production security scans', 'runbook is undocumented'] },
    { name: 'KnowledgeIndexer',  type: 'agent', status: 'failed', risk: 'critical', riskScore: 79, threatLevel: 'CRITICAL', owner: 'Nathan Wright',   department: 'Data Engineering',   backup: null,             documented: false, emerging: true,  reasons: ['currently in FAILED state', 'only Nathan Wright can restore it', 'no backup owner'], onlyRestorer: 'Nathan Wright' },
    { name: 'IncidentResponder', type: 'agent', status: 'active', risk: 'high',     riskScore: 63, threatLevel: 'HIGH',     owner: 'Aisha Khan',      department: 'Product Operations', backup: 'Diego Martinez', documented: true,  emerging: false, reasons: ['high on-call load', 'elevated escalation rate this week'] },
    { name: 'DeployBot',         type: 'agent', status: 'active', risk: 'medium',   riskScore: 46, threatLevel: 'MEDIUM',   owner: 'Diego Martinez',  department: 'DevOps',             backup: 'Yuki Tanaka',    documented: true,  emerging: false, reasons: ['moderate deployment frequency'] },
  ],
  workflows: [
    { name: 'security audit workflow', type: 'workflow', status: 'blocked', risk: 'high',   owner: 'Priya Sharma',   documented: false, currentStep: 1, totalSteps: 4, blocked: true },
    { name: 'data ingestion pipeline', type: 'workflow', status: 'active',  risk: 'high',   owner: 'Nathan Wright',  documented: false, currentStep: 4, totalSteps: 7 },
    { name: 'deployment pipeline',     type: 'workflow', status: 'running', risk: 'medium', owner: 'Diego Martinez', documented: true,  currentStep: 3, totalSteps: 5 },
    { name: 'data pipeline',           type: 'workflow', status: 'active',  risk: 'high',   owner: 'Nathan Wright',  documented: false, currentStep: 2, totalSteps: 6 },
  ],
  dailySummary:
    "Today's intelligence summary: SecurityScanner has no backup owner (CRITICAL SPOF). " +
    'Yuki Tanaka is the most overloaded person with a dependency score of 82/100. ' +
    'KnowledgeIndexer remains in FAILED state — Nathan Wright is the only person who can restore it. ' +
    'Documentation coverage is at 48.1%, improving but still below the 60% safe threshold. ' +
    '7 decisions are pending executive attention.',
}

const INLINE_INTENTS = [
  { intent_name: 'Daily Summary',     example_query: "Give me a quick summary of today's situation" },
  { intent_name: 'Biggest Risk',      example_query: 'What is my biggest risk?' },
  { intent_name: 'Overloaded People', example_query: 'Who is the most overloaded person?' },
  { intent_name: 'Ownership',         example_query: 'Who owns DeployBot?' },
  { intent_name: 'Ownership',         example_query: 'Who is responsible for the data pipeline?' },
  { intent_name: 'Ownership',         example_query: 'Who manages the security scanner?' },
  { intent_name: 'Risk',              example_query: 'What is the risk level of the incident responder?' },
  { intent_name: 'Risk',              example_query: 'Is SecurityScanner a threat?' },
  { intent_name: 'Risk',              example_query: 'How risky is the KnowledgeIndexer?' },
  { intent_name: 'Status',            example_query: 'How is the deployment pipeline running?' },
  { intent_name: 'Status',            example_query: 'What is the status of the security audit workflow?' },
  { intent_name: 'Status',            example_query: 'Is the data ingestion pipeline active?' },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s)
const noSpace = (s) => String(s).toLowerCase().replace(/\s+/g, '')

function allEntities() {
  return [...BRAIN.agents, ...BRAIN.workflows]
}

function findEntity(q) {
  const qn = noSpace(q)
  // longest name first so "data ingestion pipeline" beats "data pipeline"
  const sorted = allEntities().sort((a, b) => b.name.length - a.name.length)
  return sorted.find((e) => q.includes(e.name.toLowerCase()) || qn.includes(noSpace(e.name))) || null
}

function findPerson(q) {
  const sorted = [...BRAIN.people].sort((a, b) => b.name.length - a.name.length)
  return sorted.find((p) => q.includes(p.name.toLowerCase())) || null
}

function topRiskAgent() {
  return [...BRAIN.agents].sort((a, b) => b.riskScore - a.riskScore)[0]
}

function mostOverloaded() {
  return [...BRAIN.people].sort((a, b) => b.dependencyScore - a.dependencyScore)[0]
}

// ─────────────────────────────────────────────
// ENTITY ANSWERS
// ─────────────────────────────────────────────

function entityRisk(e) {
  if (e.type === 'agent') {
    const emerging = e.emerging ? ' It is flagged as an emerging threat.' : ''
    const reasons = e.reasons && e.reasons.length ? ` Key drivers: ${e.reasons.join('; ')}.` : ''
    return `${e.name} carries a ${e.threatLevel} risk with a predicted score of ${e.riskScore}/100. It is ${e.documented ? 'documented' : 'undocumented'} and ${e.backup ? `has backup coverage from ${e.backup}` : 'has no backup owner'}.${emerging}${reasons}`
  }
  return `${e.name} has a ${e.risk} risk level and is currently ${String(e.status).toUpperCase()}${e.blocked ? ' (BLOCKED)' : ''}. It is ${e.documented ? 'documented' : 'undocumented'}, owned by ${e.owner}.`
}

function entityOwnership(e) {
  const backup = e.backup ? `Backup coverage: ${e.backup}.` : 'There is no backup owner — this is a single point of failure.'
  const dept = e.department ? ` from ${e.department}` : ''
  return `${e.name} is owned by ${e.owner}${dept}. ${backup} It is ${e.documented ? 'documented' : 'undocumented'} and its current risk level is ${e.risk}.`
}

function entityStatus(e) {
  if (e.type === 'workflow') {
    const step = e.totalSteps ? ` Currently on step ${e.currentStep} of ${e.totalSteps}.` : ''
    const blocked = e.blocked ? ' Warning: this workflow is BLOCKED and needs attention.' : ''
    return `${e.name} is ${String(e.status).toUpperCase()} with a ${e.risk} risk level.${step}${blocked} Owner: ${e.owner}.`
  }
  const restore = e.onlyRestorer ? ` Only ${e.onlyRestorer} can restore it.` : ''
  return `${e.name} is currently ${String(e.status).toUpperCase()} with a ${e.risk} risk level (score ${e.riskScore}/100).${restore} Owner: ${e.owner}.`
}

function entityGeneral(e) {
  return `${e.name} — ${cap(e.type)}. Status: ${String(e.status).toUpperCase()}, risk: ${e.risk}. Owned by ${e.owner}${e.department ? ` (${e.department})` : ''}. ${e.backup ? `Backup: ${e.backup}.` : 'No backup owner.'} ${e.documented ? 'Documented.' : 'Undocumented.'}`
}

function answerForEntity(e, q) {
  if (/(who owns|who is responsible|who manages|owner|responsible|manage)/.test(q)) return entityOwnership(e)
  if (/(risk|threat|danger|risky|critical|exposure|vulnerab)/.test(q)) return entityRisk(e)
  if (/(status|running|active|state|health|working|\bup\b|\bdown\b|how is|how's|how are)/.test(q)) return entityStatus(e)
  return entityGeneral(e)
}

// ─────────────────────────────────────────────
// ORG-LEVEL (no entity) ANSWERS
// ─────────────────────────────────────────────

function orgBiggestRisk() {
  const a = topRiskAgent()
  return `Your biggest risk right now is ${a.name} — a ${a.threatLevel} threat scoring ${a.riskScore}/100.${a.reasons && a.reasons.length ? ` Why: ${a.reasons.join('; ')}.` : ''} Recommended action: assign a backup owner and document its runbook.`
}

function orgOverloaded() {
  const p = mostOverloaded()
  return `${p.name} (${p.role}, ${p.department}) is the most overloaded person, with a dependency score of ${p.dependencyScore}/100 and ${p.criticalAgents} critical agents on their shoulders. Spreading this load would reduce key-person risk.`
}

function orgStatus() {
  const failed = BRAIN.agents.filter((a) => a.status === 'failed').map((a) => a.name)
  const blocked = BRAIN.workflows.filter((w) => w.blocked).map((w) => w.name)
  const parts = []
  parts.push(`Overall Organizational Intelligence Score is ${BRAIN.org.intelligenceScore}/100 (${BRAIN.org.rating}).`)
  if (failed.length) parts.push(`${failed.join(', ')} ${failed.length > 1 ? 'are' : 'is'} in a FAILED state.`)
  if (blocked.length) parts.push(`${blocked.join(', ')} ${blocked.length > 1 ? 'are' : 'is'} BLOCKED.`)
  parts.push(`${BRAIN.org.spof} is a critical single point of failure.`)
  parts.push(`Documentation coverage is ${BRAIN.org.docCoverage}% (target ${BRAIN.org.docThreshold}%).`)
  parts.push(`${BRAIN.org.pendingDecisions} decisions are pending your attention.`)
  return parts.join(' ')
}

function orgDocs() {
  return `Documentation coverage is currently ${BRAIN.org.docCoverage}%, below the ${BRAIN.org.docThreshold}% safe threshold. The biggest gaps are ${BRAIN.org.spof} and ${BRAIN.org.failing}, both undocumented and high risk.`
}

function orgDecisions() {
  return `There are ${BRAIN.org.pendingDecisions} decisions pending executive attention. The most urgent are assigning a backup owner for ${BRAIN.org.spof} and restoring ${BRAIN.org.failing} from its FAILED state.`
}

function orgFailed() {
  const f = BRAIN.agents.find((a) => a.name === BRAIN.org.failing)
  return `${f.name} is currently in a FAILED state and is one of your top risks.${f.onlyRestorer ? ` Only ${f.onlyRestorer} can restore it, which makes this a key-person dependency.` : ''} It has no backup owner and is undocumented.`
}

function orgSpof() {
  const s = BRAIN.agents.find((a) => a.name === BRAIN.org.spof)
  return `${s.name} is your most critical single point of failure — it is ${s.risk} risk, has no backup owner, and is undocumented. If ${s.owner} is unavailable there is no coverage. Assigning a backup owner is the top recommended action.`
}

function orgRestore() {
  const f = BRAIN.agents.find((a) => a.name === BRAIN.org.failing)
  return `${f.onlyRestorer} is the only person who can currently restore ${f.name}. This is a key-person risk — documenting the recovery runbook would remove the dependency.`
}

function orgPeople() {
  const list = [...BRAIN.people]
    .sort((a, b) => b.dependencyScore - a.dependencyScore)
    .slice(0, 3)
    .map((p) => `${p.name} (${p.dependencyScore}/100)`)
    .join(', ')
  return `The people carrying the most organizational load are: ${list}. ${mostOverloaded().name} is the most overloaded overall.`
}

function capabilities() {
  return "I'm OBA, your Organizational Brain. I can answer questions about risks, ownership, and status across your organization. Try: \"What is my biggest risk?\", \"Who is the most overloaded person?\", \"Who owns DeployBot?\", \"Is SecurityScanner a threat?\", \"What's the overall status?\", or \"Give me today's summary.\""
}

function greeting() {
  return "Hello — I'm OBA, your Organizational Brain. I have live visibility into your agents, workflows, people, risks and decisions. What would you like to know? You can ask about your biggest risk, who owns something, or today's situation."
}

// ─────────────────────────────────────────────
// MAIN ANSWER ENGINE
// ─────────────────────────────────────────────

function answerQuery(rawQuery) {
  const query = String(rawQuery || '').trim()
  const q = query.toLowerCase()

  if (!q) return { intent: 'help', entity: null, entityType: null, answer: capabilities(), confidence: 'LOW' }

  // Greetings / small talk
  if (/^(hi|hello|hey|hiya|yo|salaam|assalam|assalamualaikum|good (morning|afternoon|evening)|greetings)\b/.test(q))
    return { intent: 'greeting', entity: null, entityType: null, answer: greeting(), confidence: 'HIGH' }

  if (/(thank|thanks|shukriya|appreciate)/.test(q))
    return { intent: 'smalltalk', entity: null, entityType: null, answer: "You're welcome. Ask me anything else about your organization's risks, ownership or status.", confidence: 'HIGH' }

  if (/(what can you do|help me|^help$|your capabilities|what do you do|who are you|what are you)/.test(q))
    return { intent: 'help', entity: null, entityType: null, answer: capabilities(), confidence: 'HIGH' }

  // Entity-specific
  const entity = findEntity(q)
  if (entity)
    return { intent: 'entity', entity, entityType: entity.type, answer: answerForEntity(entity, q), confidence: 'HIGH' }

  // Person-specific
  const person = findPerson(q)
  if (person) {
    const ans = `${person.name} is a ${person.role} in ${person.department}. They have a dependency score of ${person.dependencyScore}/100 and own ${person.criticalAgents} critical agent(s).${person.name === mostOverloaded().name ? ' They are currently the most overloaded person in the organization.' : ''}`
    return { intent: 'person', entity: null, entityType: 'person', answer: ans, confidence: 'HIGH' }
  }

  // Org-level intents (no specific entity)
  if (/(biggest|top|highest|main|worst|greatest).*(risk|threat|danger|concern|issue|problem)|(^|\s)(my|our)\s+(biggest\s+)?(risk|threat)/.test(q))
    return { intent: 'org_risk', entity: null, entityType: null, answer: orgBiggestRisk(), confidence: 'HIGH' }

  if (/(overload|busiest|most busy|too much|stretched|key person|key-person|bottleneck)/.test(q) || /(most|who).*(depend)/.test(q))
    return { intent: 'org_overloaded', entity: null, entityType: null, answer: orgOverloaded(), confidence: 'HIGH' }

  if (/(single point of failure|spof|no backup)/.test(q))
    return { intent: 'org_spof', entity: null, entityType: null, answer: orgSpof(), confidence: 'HIGH' }

  if (/(who can restore|who can fix|who can recover)/.test(q))
    return { intent: 'org_restore', entity: null, entityType: null, answer: orgRestore(), confidence: 'HIGH' }

  if (/(fail|failed|failing|broken|outage|not working|offline)/.test(q))
    return { intent: 'org_failed', entity: null, entityType: null, answer: orgFailed(), confidence: 'HIGH' }

  if (/(document|docs|coverage|runbook)/.test(q))
    return { intent: 'org_docs', entity: null, entityType: null, answer: orgDocs(), confidence: 'HIGH' }

  if (/(pending|decision|approval|awaiting)/.test(q))
    return { intent: 'org_decisions', entity: null, entityType: null, answer: orgDecisions(), confidence: 'HIGH' }

  if (/(summary|overview|brief|briefing|situation|today|going on|happening|catch me up|fill me in)/.test(q))
    return { intent: 'summary', entity: null, entityType: null, answer: BRAIN.dailySummary, confidence: 'HIGH' }

  if (/(people|team|who is who|staff|employees)/.test(q))
    return { intent: 'org_people', entity: null, entityType: null, answer: orgPeople(), confidence: 'MEDIUM' }

  if (/(status|health|how are things|how is everything|overall|state of|how are we|are we ok|are we okay)/.test(q))
    return { intent: 'org_status', entity: null, entityType: null, answer: orgStatus(), confidence: 'HIGH' }

  if (/(risk|threat|danger)/.test(q))
    return { intent: 'org_risk', entity: null, entityType: null, answer: orgBiggestRisk(), confidence: 'MEDIUM' }

  // Smart fallback — never a dead-end
  return {
    intent: 'general',
    entity: null,
    entityType: null,
    answer: `Here's where things stand. ${orgStatus()} You can also ask me about a specific agent, workflow or person — for example \"Who owns DeployBot?\" or \"Is SecurityScanner a threat?\"`,
    confidence: 'MEDIUM',
  }
}

async function logHistory(query, r) {
  if (!supabase) return
  try {
    await supabase.from('voice_history').insert({
      query,
      detected_intent: r.intent,
      resolved_entity: r.entity ? r.entity.name : null,
      entity_type: r.entityType,
      answer: r.answer,
      confidence: r.confidence,
    })
  } catch (_) { /* best-effort */ }
}

function respond(res, query, r) {
  res.json({
    query,
    detectedIntent: r.intent,
    resolvedEntity: r.entity ? r.entity.name : null,
    entityType: r.entityType,
    answer: r.answer,
    confidence: r.confidence,
  })
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /api/voice/ask?q=...
router.get('/ask', async (req, res) => {
  try {
    const query = req.query.q
    if (!query) return res.status(400).json({ error: 'Provide a query using ?q=' })
    const r = answerQuery(query)
    await logHistory(query, r)
    respond(res, query, r)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/ask  { q } or { text } or { question }
router.post('/ask', async (req, res) => {
  try {
    const body = req.body || {}
    const query = body.q || body.text || body.question || ''
    if (!query) return res.status(400).json({ error: 'Provide a query in the request body (q/text/question).' })
    const r = answerQuery(query)
    await logHistory(query, r)
    respond(res, query, r)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/command  { text }  (used by the voice UI)
router.post('/command', async (req, res) => {
  try {
    const body = req.body || {}
    const query = body.text || body.q || body.question || ''
    const r = answerQuery(query)
    await logHistory(query, r)
    res.json({ status: 'ok', query, answer: r.answer, detectedIntent: r.intent, confidence: r.confidence })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/voice/intents
router.get('/intents', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('voice_intents')
        .select('intent_name, example_query')
        .order('intent_name')
      if (!error && data && data.length) return res.json(data)
    }
  } catch (_) { /* fall through */ }
  res.json(INLINE_INTENTS)
})

// GET /api/voice/history
router.get('/history', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('voice_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (!error && data) return res.json(data)
    }
  } catch (_) { /* fall through */ }
  res.json([])
})

// GET /api/voice/daily-summary
router.get('/daily-summary', async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('voice_daily_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!error && data && data.summary) return res.json(data)
    }
  } catch (_) { /* fall through */ }
  res.json({ summary: BRAIN.dailySummary })
})

module.exports = router

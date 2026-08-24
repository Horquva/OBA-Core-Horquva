const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')
const { loadDataset: loadOrgDataset } = domain
const { atOrAbove } = require('../../domain/definitions')
const { must } = require('../../lib/supabaseQuery')

// ─────────────────────────────────────────────
// LIVE ORGANIZATIONAL BRAIN
// Replaces a hardcoded fixture that mixed real employee names (Yuki Tanaka,
// Nathan Wright, Priya Sharma) with wrong ownership and fake coworkers
// (Diego Martinez, Aisha Khan) — the answer engine below now reads real
// Supabase data on every request instead of a fixture that could silently
// contradict the actual database using the database's own names.
// ─────────────────────────────────────────────

const RISK_SCORE = { critical: 90, high: 70, medium: 50, low: 25 }

function reasonsFor({ backup, documented, status }) {
  const reasons = []
  if (!backup) reasons.push('no backup owner — single point of failure')
  if (!documented) reasons.push('undocumented')
  if (status === 'failed') reasons.push('currently in a FAILED state')
  if (status === 'blocked') reasons.push('currently BLOCKED')
  return reasons
}

async function buildBrain() {
  const [
    d,
    { data: pendingDecisions, error: e3 },
    { data: orchestration, error: e4 },
  ] = await Promise.all([
    loadOrgDataset(),
    supabase.from('pending_decisions').select('*'),
    supabase.from('workflow_orchestration').select('*, workflows ( name )'),
  ])
  if (e3 || e4) throw new Error((e3 || e4).message)

  // Predictions come from the live computation now. Reading them from
  // `predictive_risk_scores` meant the voice assistant answered "what is most
  // at risk?" from a table that had not changed since it was seeded.
  const intel = await domain.intelligence.all()
  const predictiveByAgentName = Object.fromEntries(
    intel.predictiveRisk.scores.filter((p) => p.agentName).map((p) => [p.agentName, p]),
  )
  const orchestrationByWorkflowName = Object.fromEntries((orchestration || []).filter((o) => o.workflows?.name).map((o) => [o.workflows.name, o]))

  const agents = d.agents.map((a) => {
    const pred = predictiveByAgentName[a.name]
    return {
      name: a.name,
      type: 'agent',
      status: a.status,
      risk: a.criticality,
      riskScore: pred ? pred.predictedScore : RISK_SCORE[a.criticality] || 40,
      threatLevel: pred ? pred.threatLevel : String(a.criticality || 'medium').toUpperCase(),
      owner: a.owner,
      department: a.department,
      backup: a.backup_owner,
      documented: !!a.documented,
      emerging: pred ? !!pred.isEmergingThreat : false,
      reasons: pred ? pred.reasons : reasonsFor({ backup: a.backup_owner, documented: a.documented, status: a.status }),
      onlyRestorer: a.status === 'failed' && !a.backup_owner ? a.owner : null,
    }
  })

  const workflows = d.workflows.map((w) => {
    const orch = orchestrationByWorkflowName[w.name]
    const status = orch ? orch.status : w.status
    return {
      name: w.name,
      type: 'workflow',
      status,
      risk: w.criticality,
      owner: w.owner,
      documented: !!w.documented,
      currentStep: orch ? orch.current_step : null,
      totalSteps: orch ? orch.total_steps : null,
      blocked: status === 'blocked',
    }
  })

  // criticalAgents owned per person, for the people list below
  const ownedCritCount = {}
  ;[...d.agents, ...d.workflows].forEach((a) => {
    if (a.owner && atOrAbove(a.criticality, 'high')) {
      ownedCritCount[a.owner] = (ownedCritCount[a.owner] || 0) + 1
    }
  })
  // Was `hero_dependencies`, a seeded table — so the assistant's answer to
  // "who is the organization most dependent on?" could not change. Computed now.
  const people = intel.executiveMemory.items
    .filter((i) => i.memoryType === 'hero_risk')
    .map((h) => ({
      name: h.entityName,
      department: null,
      role: null,
      riskLevel: h.severity,
      description: h.description,
      criticalAgents: ownedCritCount[h.entityName] || 0,
    }))

  // Was a local 0.5·documented + 0.5·backed formula — a second, independently
  // computed "Organizational Intelligence Score" alongside derived.js's
  // pillars.orgScore (F-C). There is one OIS now (D-02).
  const intelligenceScore = intel.pillars.orgScore.score
  const rating = intel.pillars.orgScore.rating

  const failing = agents.find((a) => a.status === 'failed') || null
  const spof = [...agents].sort((a, b) => b.riskScore - a.riskScore)[0] || null
  const latestHistory = d.history[d.history.length - 1] || {}

  return {
    org: {
      intelligenceScore,
      rating,
      docCoverage: latestHistory.documented_pct ?? null,
      docThreshold: 60,
      pendingDecisions: (pendingDecisions || []).length,
      spof: spof ? spof.name : null,
      failing: failing ? failing.name : null,
    },
    people,
    agents,
    workflows,
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s)
const noSpace = (s) => String(s).toLowerCase().replace(/\s+/g, '')

// Real entity names don't always match casual phrasing — the real workflow
// "Security Audit Process" won't substring-match "the security audit
// workflow" the way a fixture's names happened to. Category words like
// "workflow"/"process"/"pipeline" are interchangeable in how people actually
// ask, so they're stripped before scoring a fuzzy match on what's left.
const GENERIC_WORDS = new Set(['the', 'a', 'an', 'workflow', 'process', 'pipeline', 'agent', 'bot', 'system', 'platform', 'tool'])

function significantTokens(name) {
  const tokens = String(name).toLowerCase().split(/\s+/).filter(Boolean)
  const sig = tokens.filter((t) => !GENERIC_WORDS.has(t))
  return sig.length ? sig : tokens
}

function allEntities(brain) {
  return [...brain.agents, ...brain.workflows]
}

function findEntity(brain, q) {
  const qn = noSpace(q)
  const all = allEntities(brain)

  // 1) exact / substring match — fast, most reliable, tried first
  const sorted = [...all].sort((a, b) => b.name.length - a.name.length)
  const exact = sorted.find((e) => q.includes(e.name.toLowerCase()) || qn.includes(noSpace(e.name)))
  if (exact) return exact

  // 2) fuzzy fallback — score by how many of the name's significant words
  // appear in the query, ignoring generic category words
  const qTokens = new Set(q.split(/\s+/))
  let best = null
  let bestScore = 0
  for (const e of all) {
    const sig = significantTokens(e.name)
    const matched = sig.filter((t) => qTokens.has(t)).length
    const score = matched / sig.length
    if (matched >= 1 && score >= 0.5 && score > bestScore) {
      bestScore = score
      best = e
    }
  }
  return best
}

function findPerson(brain, q) {
  const qTokens = new Set(q.split(/\s+/))
  const sorted = [...brain.people].sort((a, b) => b.name.length - a.name.length)

  // 1) exact full-name match
  const exact = sorted.find((p) => q.includes(p.name.toLowerCase()))
  if (exact) return exact

  // 2) fuzzy fallback — a first or last name alone ("does Yuki have backup")
  return sorted.find((p) => p.name.toLowerCase().split(/\s+/).some((t) => t.length > 2 && qTokens.has(t))) || null
}

function topRiskAgent(brain) {
  return [...brain.agents].sort((a, b) => b.riskScore - a.riskScore)[0] || null
}

function mostLoadedPerson(brain) {
  return [...brain.people].sort((a, b) => b.criticalAgents - a.criticalAgents)[0] || null
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
  return `${e.name} has a ${e.risk} risk level and is currently ${String(e.status || 'unknown').toUpperCase()}${e.blocked ? ' (BLOCKED)' : ''}. It is ${e.documented ? 'documented' : 'undocumented'}, owned by ${e.owner || 'nobody — unowned'}.`
}

function entityOwnership(e) {
  const backup = e.backup ? `Backup coverage: ${e.backup}.` : 'There is no backup owner — this is a single point of failure.'
  const dept = e.department ? ` from ${e.department}` : ''
  return `${e.name} is owned by ${e.owner || 'nobody — it is unowned'}${dept}. ${backup} It is ${e.documented ? 'documented' : 'undocumented'} and its current risk level is ${e.risk}.`
}

function entityStatus(e) {
  if (e.type === 'workflow') {
    const step = e.totalSteps ? ` Currently on step ${e.currentStep} of ${e.totalSteps}.` : ''
    const blocked = e.blocked ? ' Warning: this workflow is BLOCKED and needs attention.' : ''
    return `${e.name} is ${String(e.status || 'unknown').toUpperCase()} with a ${e.risk} risk level.${step}${blocked} Owner: ${e.owner || 'unassigned'}.`
  }
  const restore = e.onlyRestorer ? ` Only ${e.onlyRestorer} can restore it.` : ''
  return `${e.name} is currently ${String(e.status || 'unknown').toUpperCase()} with a ${e.risk} risk level (score ${e.riskScore}/100).${restore} Owner: ${e.owner || 'unassigned'}.`
}

function entityGeneral(e) {
  return `${e.name} — ${cap(e.type)}. Status: ${String(e.status || 'unknown').toUpperCase()}, risk: ${e.risk}. Owned by ${e.owner || 'nobody'}${e.department ? ` (${e.department})` : ''}. ${e.backup ? `Backup: ${e.backup}.` : 'No backup owner.'} ${e.documented ? 'Documented.' : 'Undocumented.'}`
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

function orgBiggestRisk(brain) {
  const a = topRiskAgent(brain)
  if (!a) return "I don't have enough data to identify a biggest risk right now."
  return `Your biggest risk right now is ${a.name} — a ${a.threatLevel} threat scoring ${a.riskScore}/100.${a.reasons && a.reasons.length ? ` Why: ${a.reasons.join('; ')}.` : ''} Recommended action: assign a backup owner and document its runbook.`
}

function orgOverloaded(brain) {
  const p = mostLoadedPerson(brain)
  if (!p) return "I don't have enough data to identify who's most overloaded right now."
  return `${p.name}${p.department ? ` (${p.department})` : ''} carries the most key-person risk — they own ${p.criticalAgents} critical asset(s) with no backup coverage. ${p.description || ''}`.trim()
}

function orgStatus(brain) {
  const failed = brain.agents.filter((a) => a.status === 'failed').map((a) => a.name)
  const blocked = brain.workflows.filter((w) => w.blocked).map((w) => w.name)
  const parts = []
  parts.push(`Overall Organizational Intelligence Score is ${brain.org.intelligenceScore}/100 (${brain.org.rating}).`)
  if (failed.length) parts.push(`${failed.join(', ')} ${failed.length > 1 ? 'are' : 'is'} in a FAILED state.`)
  if (blocked.length) parts.push(`${blocked.join(', ')} ${blocked.length > 1 ? 'are' : 'is'} BLOCKED.`)
  if (brain.org.spof) parts.push(`${brain.org.spof} is a critical single point of failure.`)
  if (brain.org.docCoverage != null) parts.push(`Documentation coverage is ${brain.org.docCoverage}% (target ${brain.org.docThreshold}%).`)
  parts.push(`${brain.org.pendingDecisions} decision(s) are pending your attention.`)
  return parts.join(' ')
}

function orgDocs(brain) {
  const cov = brain.org.docCoverage != null ? `${brain.org.docCoverage}%` : 'not currently measured'
  const gaps = [brain.org.spof, brain.org.failing].filter(Boolean)
  return `Documentation coverage is currently ${cov}, target ${brain.org.docThreshold}%.${gaps.length ? ` The biggest gaps include ${gaps.join(' and ')}.` : ''}`
}

function orgDecisions(brain) {
  const items = [brain.org.spof && `assigning a backup owner for ${brain.org.spof}`, brain.org.failing && `restoring ${brain.org.failing} from its FAILED state`].filter(Boolean)
  return `There are ${brain.org.pendingDecisions} decision(s) pending executive attention.${items.length ? ` The most urgent are ${items.join(' and ')}.` : ''}`
}

function orgFailed(brain) {
  const f = brain.agents.find((a) => a.name === brain.org.failing)
  if (!f) return 'Nothing is currently in a FAILED state.'
  return `${f.name} is currently in a FAILED state and is one of your top risks.${f.onlyRestorer ? ` Only ${f.onlyRestorer} can restore it, which makes this a key-person dependency.` : ''} ${f.backup ? `Backup: ${f.backup}.` : 'It has no backup owner.'} ${f.documented ? 'Documented.' : 'Undocumented.'}`
}

function orgSpof(brain) {
  const s = brain.agents.find((a) => a.name === brain.org.spof)
  if (!s) return "I don't have enough data to identify a single point of failure right now."
  return `${s.name} is your most critical single point of failure — it is ${s.risk} risk, ${s.backup ? `has backup coverage from ${s.backup}` : 'has no backup owner'}, and is ${s.documented ? 'documented' : 'undocumented'}. If ${s.owner || 'its owner'} is unavailable there is no coverage. Assigning a backup owner is the top recommended action.`
}

function orgRestore(brain) {
  const f = brain.agents.find((a) => a.name === brain.org.failing)
  if (!f || !f.onlyRestorer) return "I don't have a specific single-person restore dependency on record right now."
  return `${f.onlyRestorer} is the only person who can currently restore ${f.name}. This is a key-person risk — documenting the recovery runbook would remove the dependency.`
}

function orgPeople(brain) {
  if (!brain.people.length) return "I don't have hero-dependency data on record right now."
  const list = brain.people.slice(0, 3).map((p) => `${p.name} (${p.criticalAgents} critical asset(s))`).join(', ')
  const top = mostLoadedPerson(brain)
  return `The people carrying the most key-person risk are: ${list}.${top ? ` ${top.name} carries the most load overall.` : ''}`
}

function capabilities() {
  return "I'm OBA, your Organizational Brain. I can answer questions about risks, ownership, and status across your organization. Try: \"What is my biggest risk?\", \"Who is the most overloaded person?\", \"Who owns DeployBot?\", \"Is SecurityScanner a threat?\", \"What's the overall status?\", or \"Give me today's summary.\""
}

function greeting() {
  return "Hello — I'm OBA, your Organizational Brain. I have live visibility into your agents, workflows, people, risks and decisions. What would you like to know? You can ask about your biggest risk, who owns something, or today's situation."
}

function dailySummary(brain) {
  const parts = []
  if (brain.org.spof) parts.push(`${brain.org.spof} has no backup owner (CRITICAL SPOF).`)
  const top = mostLoadedPerson(brain)
  if (top) parts.push(`${top.name} carries the most key-person risk, owning ${top.criticalAgents} critical asset(s) with no backup.`)
  if (brain.org.failing) {
    const f = brain.agents.find((a) => a.name === brain.org.failing)
    parts.push(`${brain.org.failing} remains in a FAILED state${f?.onlyRestorer ? ` — ${f.onlyRestorer} is the only person who can restore it` : ''}.`)
  }
  if (brain.org.docCoverage != null) parts.push(`Documentation coverage is at ${brain.org.docCoverage}%, target ${brain.org.docThreshold}%.`)
  parts.push(`${brain.org.pendingDecisions} decision(s) are pending executive attention.`)
  return `Today's intelligence summary: ${parts.join(' ')}`
}

// ─────────────────────────────────────────────
// MAIN ANSWER ENGINE
// ─────────────────────────────────────────────

function answerQuery(rawQuery, brain) {
  const query = String(rawQuery || '').trim()
  const q = query.toLowerCase()

  if (!q) return { intent: 'help', entity: null, entityType: null, answer: capabilities(), confidence: 'LOW' }

  if (/^(hi|hello|hey|hiya|yo|salaam|assalam|assalamualaikum|good (morning|afternoon|evening)|greetings)\b/.test(q))
    return { intent: 'greeting', entity: null, entityType: null, answer: greeting(), confidence: 'HIGH' }

  if (/(thank|thanks|shukriya|appreciate)/.test(q))
    return { intent: 'smalltalk', entity: null, entityType: null, answer: "You're welcome. Ask me anything else about your organization's risks, ownership or status.", confidence: 'HIGH' }

  if (/(what can you do|help me|^help$|your capabilities|what do you do|who are you|what are you)/.test(q))
    return { intent: 'help', entity: null, entityType: null, answer: capabilities(), confidence: 'HIGH' }

  const entity = findEntity(brain, q)
  if (entity)
    return { intent: 'entity', entity, entityType: entity.type, answer: answerForEntity(entity, q), confidence: 'HIGH' }

  const person = findPerson(brain, q)
  if (person) {
    const top = mostLoadedPerson(brain)
    const ans = `${person.name}${person.department ? ` is from ${person.department}` : ''}. They own ${person.criticalAgents} critical asset(s) with no backup coverage.${top && person.name === top.name ? ' They currently carry the most key-person risk in the organization.' : ''}`
    return { intent: 'person', entity: null, entityType: 'person', answer: ans, confidence: 'HIGH' }
  }

  if (/(biggest|top|highest|main|worst|greatest).*(risk|threat|danger|concern|issue|problem)|(^|\s)(my|our)\s+(biggest\s+)?(risk|threat)/.test(q))
    return { intent: 'org_risk', entity: null, entityType: null, answer: orgBiggestRisk(brain), confidence: 'HIGH' }

  if (/(overload|busiest|most busy|too much|stretched|key person|key-person|bottleneck)/.test(q) || /(most|who).*(depend)/.test(q))
    return { intent: 'org_overloaded', entity: null, entityType: null, answer: orgOverloaded(brain), confidence: 'HIGH' }

  if (/(single point of failure|spof|no backup)/.test(q))
    return { intent: 'org_spof', entity: null, entityType: null, answer: orgSpof(brain), confidence: 'HIGH' }

  if (/(who can restore|who can fix|who can recover)/.test(q))
    return { intent: 'org_restore', entity: null, entityType: null, answer: orgRestore(brain), confidence: 'HIGH' }

  if (/(fail|failed|failing|broken|outage|not working|offline)/.test(q))
    return { intent: 'org_failed', entity: null, entityType: null, answer: orgFailed(brain), confidence: 'HIGH' }

  if (/(document|docs|coverage|runbook)/.test(q))
    return { intent: 'org_docs', entity: null, entityType: null, answer: orgDocs(brain), confidence: 'HIGH' }

  if (/(pending|decision|approval|awaiting)/.test(q))
    return { intent: 'org_decisions', entity: null, entityType: null, answer: orgDecisions(brain), confidence: 'HIGH' }

  if (/(summary|overview|brief|briefing|situation|today|going on|happening|catch me up|fill me in)/.test(q))
    return { intent: 'summary', entity: null, entityType: null, answer: dailySummary(brain), confidence: 'HIGH' }

  if (/(people|team|who is who|staff|employees)/.test(q))
    return { intent: 'org_people', entity: null, entityType: null, answer: orgPeople(brain), confidence: 'MEDIUM' }

  if (/(status|health|how are things|how is everything|overall|state of|how are we|are we ok|are we okay)/.test(q))
    return { intent: 'org_status', entity: null, entityType: null, answer: orgStatus(brain), confidence: 'HIGH' }

  if (/(risk|threat|danger)/.test(q))
    return { intent: 'org_risk', entity: null, entityType: null, answer: orgBiggestRisk(brain), confidence: 'MEDIUM' }

  return {
    intent: 'general',
    entity: null,
    entityType: null,
    answer: `Here's where things stand. ${orgStatus(brain)} You can also ask me about a specific agent, workflow or person — for example \"Who owns DeployBot?\" or \"Is SecurityScanner a threat?\"`,
    confidence: 'MEDIUM',
  }
}

async function logHistory(query, r) {
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
    const brain = await buildBrain()
    const r = answerQuery(query, brain)
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
    const brain = await buildBrain()
    const r = answerQuery(query, brain)
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
    const brain = await buildBrain()
    const r = answerQuery(query, brain)
    await logHistory(query, r)
    res.json({ status: 'ok', query, answer: r.answer, detectedIntent: r.intent, confidence: r.confidence })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/voice/intents — the fixed list of query categories this engine
// understands (documentation of real code behavior, not organizational
// data), unless voice_intents has been populated with something richer.
const SUPPORTED_INTENTS = [
  { intent_name: 'Daily Summary', example_query: "Give me a quick summary of today's situation" },
  { intent_name: 'Biggest Risk', example_query: 'What is my biggest risk?' },
  { intent_name: 'Overloaded People', example_query: 'Who is the most overloaded person?' },
  { intent_name: 'Ownership', example_query: 'Who owns DeployBot?' },
  { intent_name: 'Risk', example_query: 'Is SecurityScanner a threat?' },
  { intent_name: 'Status', example_query: 'What is the status of the security audit workflow?' },
]
router.get('/intents', async (req, res) => {
  try {
    const { data, error } = await supabase.from('voice_intents').select('intent_name, example_query').order('intent_name')
    // Falling back to SUPPORTED_INTENTS is deliberate and safe — it documents
    // this engine's real code behavior rather than organizational data, so it
    // cannot misreport the org. But a failed query is still logged rather than
    // silently absorbed into an identical-looking response.
    if (error) console.warn(`[voice] voice_intents read failed, serving the built-in list: ${error.message}`)
    else if (data && data.length) return res.json(data)
  } catch (e) {
    console.warn(`[voice] voice_intents read threw, serving the built-in list: ${e.message}`)
  }
  res.json(SUPPORTED_INTENTS)
})

// GET /api/voice/history
// Unlike /intents there is no honest fallback for a log — an empty array is a
// factual claim that nothing has been asked. This used to answer 200 [] on a
// failed read, so a broken query looked like a fresh, unused assistant.
router.get('/history', async (req, res) => {
  try {
    const data = await must('voice_history', supabase
      .from('voice_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/voice/daily-summary — always computed live. voice_daily_summary
// (sql/04_fizza_modules_seed.sql) is a one-time seeded row that nothing ever
// refreshes, so trusting it over a fresh computation would just be a
// different stale fallback wearing a database's clothing.
router.get('/daily-summary', async (req, res) => {
  try {
    const brain = await buildBrain()
    res.json({ summary: dailySummary(brain) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

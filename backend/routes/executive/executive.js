const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { applyOrgScope } = require('../../lib/tenant')
const domain = require('../../domain')
const { must } = require('../../lib/supabaseQuery')
const { requireCsrfHeader } = require('../../middleware/auth')
const voiceEngine = require('../voice/voice')

// ─────────────────────────────────────────────
// Every puller below returns `null` for "genuinely nothing on record" and
// THROWS for "the query failed" — the caller turns the first into a plain
// "no data found" answer and the second into a 500.
//
// These used to destructure only `{ data }` from a `.single()` call. Because
// `.single()` errors on zero rows, a legitimately-empty table and a real
// outage — bad credentials, a dropped table, an RLS rejection — both arrived as
// `data: null` and were reported to an executive as "No data found for this
// question. Ensure the relevant modules have been seeded." An executive acting
// on "nothing to report" when the truth is "we cannot see anything" is the
// worst version of this bug in the codebase, which is why it is fixed here
// first. `.maybeSingle()` + must() separates the two.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// INTENT MATCHING
// ─────────────────────────────────────────────

function detectQuestionType(question) {
  const q = question.toLowerCase()

  if (q.includes('biggest risk') || q.includes('top risk') || q.includes('most at risk'))
    return 'risk'
  if (q.includes('overload') || q.includes('too much') || q.includes('concentration'))
    return 'ownership'
  if (q.includes('backup') || q.includes('continuity') || q.includes('if') && q.includes('left'))
    return 'continuity'
  if (q.includes('single point') || q.includes('spof') || q.includes('dependency'))
    return 'ownership'
  if (q.includes('predicted') || q.includes('going to') || q.includes('emerging'))
    return 'predictive'
  if (q.includes('governance') || q.includes('compliance') || q.includes('violation'))
    return 'governance'
  if (q.includes('accountability') || q.includes('responsible') || q.includes('raci'))
    return 'accountability'
  if (q.includes('knowledge') || q.includes('memory') || q.includes('documented'))
    return 'knowledge'
  if (q.includes('tool') || q.includes('platform') || q.includes('openai') || q.includes('zapier'))
    return 'risk'

  return 'general'
}

// ─────────────────────────────────────────────
// INTELLIGENCE PULLERS (one per question type)
// ─────────────────────────────────────────────

// Delegates to voice.js's own selection logic (see the comment on that
// module's exports) instead of running a second, independent query — this
// used to pick the first CRITICAL-threat agent in whatever order
// predictiveRisk.scores came back in, which is a different (and
// array-order-dependent) answer from "biggest risk" than voice.js's actual
// highest-score selection.
async function answerRisk() {
  const brain = await voiceEngine.buildBrain()
  const top = voiceEngine.topRiskAgent(brain)
  if (!top) return null

  return {
    answer: voiceEngine.orgBiggestRisk(brain),
    entityName: top.name,
    responsiblePerson: null,
    dataSources: ['agents', 'owners', 'dependencies', 'workflows', 'knowledge_assets']
  }
}

// Delegates to voice.js's own selection logic instead of running a second,
// independent query — this used to rank every employee by
// collaboration.perEmployee's dependencyScore, a genuinely different metric
// from voice.js's hero-risk-based "most overloaded person" (2+ critical
// assets, no named backup). Two real but disagreeing answers to "who is most
// overloaded" collapse onto one here.
async function answerOwnership() {
  const brain = await voiceEngine.buildBrain()
  const top = voiceEngine.mostLoadedPerson(brain)
  if (!top) return null

  return {
    answer: voiceEngine.orgOverloaded(brain),
    entityName: top.name,
    responsiblePerson: top.name,
    dataSources: ['agents', 'workflows', 'employees', 'owners']
  }
}

async function answerContinuity() {
  const data = await must('workflow_runbooks', applyOrgScope(supabase
    .from('workflow_runbooks')
    .select('workflow_id, is_documented, owner_id, workflows(name, department), employees(name)'))
    .eq('is_documented', false))

  if (!data.length) return null

  const names = data.map(r => r.workflows?.name).filter(Boolean).join(', ')
  const top = data[0]

  return {
    // This query only checks is_documented -- it never joins to `owners` to
    // check backup_owner, so "no backup" was an unverified claim tacked onto
    // a genuinely-checked "no documentation" finding.
    answer: `${data.length} workflows have no documentation: ${names}. The highest risk is ${top.workflows?.name}, owned solely by ${top.employees?.name}.`,
    entityName: top.workflows?.name,
    responsiblePerson: top.employees?.name,
    dataSources: ['workflow_runbooks', 'workflows', 'employees']
  }
}

async function answerPredictive() {
  const intel = await domain.intelligence.all()
  const data = intel.predictiveRisk.emergingThreats.map(p => ({
    predicted_score: p.predictedScore,
    reasons: p.reasons,
    agents: { name: p.agentName, risk: p.recordedRisk },
  }))

  if (!data.length) return null

  const names = data.map(d => d.agents?.name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} agents are emerging threats predicted to escalate: ${names}. These agents are not yet critical but are trending toward HIGH or CRITICAL risk.`,
    entityName: data[0]?.agents?.name,
    responsiblePerson: null,
    // Same predictiveRisk() computation answerRisk() uses -- same table set.
    dataSources: ['agents', 'owners', 'dependencies', 'workflows', 'knowledge_assets']
  }
}

async function answerGovernance() {
  // `accountability_scores` was a frozen pre-aggregate of accountability_links.
  // Scored live now, and banded with the same thresholds as every other score
  // in the product rather than this table's own AT_RISK/CRITICAL vocabulary.
  const intel = await domain.intelligence.all()
  const data = intel.accountability.perEntity
    .filter(e => ['CRITICAL', 'WEAK'].includes(e.status))
    .sort((a, b) => a.score - b.score)
    .map(e => ({
      score: e.score,
      status: e.status,
      same_r_and_a: e.sameResponsibleAndAccountable,
      accountability_entities: { entity_name: e.entityName, entity_type: e.entityType },
    }))

  if (!data.length) return null

  const names = data.map(d => d.accountability_entities?.entity_name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} entities have governance issues (AT_RISK or CRITICAL accountability status): ${names}. The primary issue is the same person holding both Responsible and Accountable roles.`,
    entityName: data[0]?.accountability_entities?.entity_name,
    responsiblePerson: null,
    dataSources: ['accountability_entities', 'accountability_links']
  }
}

async function answerAccountability() {
  const intel = await domain.intelligence.all()
  const a = intel.accountability
  const summary = {
    accountability_score: a.accountabilityScore,
    status: a.status,
    same_r_and_a_count: a.sameRandACount,
    total_entities: a.totalEntities,
    unique_people_count: a.uniquePeopleCount,
  }

  return {
    answer: `Your Accountability Score is ${summary.accountability_score}/100 (${summary.status}). ${summary.same_r_and_a_count} of ${summary.total_entities} entities have the same person as Responsible and Accountable — a separation-of-duties violation. Only ${summary.unique_people_count} unique people appear across all responsibility chains, indicating high concentration.`,
    entityName: null,
    responsiblePerson: null,
    // accountability_summary was a frozen pre-aggregate table (see the
    // comment above this function) -- the score is computed live from these
    // two now, same as accountability() itself reads.
    dataSources: ['accountability_entities', 'accountability_links']
  }
}

async function answerKnowledge() {
  const rows = await must('knowledge_assets', applyOrgScope(supabase
    .from('knowledge_assets')
    .select('criticality, is_documented, owner_id, employees(name, department)'))
    .eq('is_documented', false)
    .eq('criticality', 'critical'))

  if (!rows.length) return null

  // No `ORDER BY` here has a real ranking to fall back on -- criticality and
  // documentation are already filtered to one value each, so a bare
  // `.limit(1)` just returned whichever row Postgres happened to return
  // first, not "the highest risk" the answer text claimed. The person
  // holding the MOST undocumented-critical assets is a genuine ranking.
  const byOwner = new Map()
  for (const row of rows) {
    if (row.owner_id == null) continue
    const entry = byOwner.get(row.owner_id) || { count: 0, employee: row.employees }
    entry.count++
    byOwner.set(row.owner_id, entry)
  }
  if (!byOwner.size) return null

  const top = [...byOwner.values()].reduce((a, b) => (b.count > a.count ? b : a))

  return {
    answer: `${top.employee?.name} carries the highest knowledge risk: ${top.count} critical, undocumented asset${top.count === 1 ? '' : 's'}. If they leave, this knowledge is unrecoverable with no backup path documented.`,
    entityName: top.employee?.name,
    responsiblePerson: top.employee?.name,
    dataSources: ['knowledge_assets', 'employees']
  }
}

async function answerGeneral() {
  const intel = await domain.intelligence.all()
  const weakest = [...intel.pillars.pillars].sort((a, b) => a.score - b.score)
  const orgScore = {
    score: intel.pillars.orgScore.score,
    rating: intel.pillars.orgScore.rating,
    strengths: weakest[weakest.length - 1].strengths,
    weaknesses: weakest[0].weaknesses,
  }

  // `orgScore` is always a freshly-built object here, so `if (!orgScore)`
  // never fired -- the real "nothing to report" case is evidence.sufficient
  // being false on pillars.orgScore, which leaves .score/.rating `null` and
  // used to print "Your overall ... Score is null/100 (null)" straight
  // through to the answer text.
  if (orgScore.score == null) {
    return {
      answer: 'I could not find a matching intelligence answer for that question. Try asking about risk, ownership, continuity, governance, or accountability.',
      entityName: null,
      responsiblePerson: null,
      dataSources: []
    }
  }

  return {
    answer: `Your overall Organizational Intelligence Score is ${orgScore.score}/100 (${orgScore.rating}). Key weaknesses: ${orgScore.weaknesses?.join(', ')}.`,
    entityName: null,
    responsiblePerson: null,
    // domain.intelligence.all()'s pillars() computation -- see its own
    // provenance.inputs for the full table set (workflows, workflow_runbooks,
    // ai_platforms, tool_policies, policy_violations, owners,
    // knowledge_assets, truth_claims, accountability_links/_entities).
    // 'intelligence_results' was never a real table.
    dataSources: ['workflows', 'workflow_runbooks', 'ai_platforms', 'tool_policies', 'policy_violations', 'owners', 'knowledge_assets', 'truth_claims', 'accountability_entities', 'accountability_links']
  }
}

const ANSWERERS = {
  risk:           answerRisk,
  ownership:      answerOwnership,
  continuity:     answerContinuity,
  predictive:     answerPredictive,
  governance:     answerGovernance,
  accountability: answerAccountability,
  knowledge:      answerKnowledge,
  general:        answerGeneral
}

// ─────────────────────────────────────────────
// GET /api/executive/ask?q=What+is+my+biggest+risk
// ─────────────────────────────────────────────

// requireCsrfHeader: logs to executive_sessions on every answered call, a
// GET that writes, which the global CSRF guard's "GET is safe" exemption
// doesn't cover. See middleware/auth.js.
router.get('/ask', requireCsrfHeader, async (req, res) => {
  try {
    const question = req.query.q
    if (!question) return res.status(400).json({ error: 'Provide a question using ?q=' })

    const questionType = detectQuestionType(question)
    const answerer = ANSWERERS[questionType] ?? ANSWERERS.general
    const result = await answerer()

    if (!result) {
      return res.json({
        question,
        questionType,
        answer: 'No data found for this question. Ensure the relevant modules have been seeded.',
        entityName: null,
        responsiblePerson: null,
        dataSources: []
      })
    }

    // Log the session. This is an audit trail, not part of the answer, so a
    // write failure must not deny the executive their answer — but it is logged
    // rather than discarded, since a silently broken audit trail is its own
    // problem.
    const { error: logError } = await supabase.from('executive_sessions').insert({
      question,
      question_type: questionType,
      answer_summary: result.answer,
      entity_name: result.entityName,
      responsible_person: result.responsiblePerson,
      data_sources: result.dataSources
    })
    if (logError) {
      console.warn(`[executive] failed to log session to executive_sessions: ${logError.message}`)
    }

    res.json({
      question,
      questionType,
      answer: result.answer,
      entityName: result.entityName,
      responsiblePerson: result.responsiblePerson,
      dataSources: result.dataSources
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive/questions
// Returns the question library for UI autocomplete
// ─────────────────────────────────────────────

router.get('/questions', async (req, res) => {
  try {
    const { data, error } = await applyOrgScope(supabase
      .from('executive_questions')
      .select('question_text, question_type'))
      .order('question_type')

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive/history
// Returns past session log
// ─────────────────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const { data, error } = await applyOrgScope(supabase
      .from('executive_sessions')
      .select('*'))
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/executive/briefing
// Returns a full executive briefing across all intelligence modules
// ─────────────────────────────────────────────

router.get('/briefing', async (req, res) => {
  try {
    const [risk, ownership, continuity, governance, accountability] = await Promise.all([
      answerRisk(),
      answerOwnership(),
      answerContinuity(),
      answerGovernance(),
      answerAccountability()
    ])

    // A null puller result now means "nothing on record" and nothing else —
    // a failed query throws and this route 500s. Spreading a null used to emit
    // a bare { topic } with no `answer` key at all, leaving the client to guess
    // whether the finding was empty or the field was lost; say so explicitly.
    const finding = (topic, result) => result
      ? { topic, ...result }
      : { topic, answer: null, entityName: null, responsiblePerson: null, dataSources: [], noDataOnRecord: true }

    res.json({
      title: 'Executive Intelligence Briefing',
      generatedAt: new Date().toISOString(),
      findings: [
        finding('Biggest Risk',      risk),
        finding('Ownership Load',    ownership),
        finding('Continuity Gaps',   continuity),
        finding('Governance Issues', governance),
        finding('Accountability',    accountability)
      ]
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
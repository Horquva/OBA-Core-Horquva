const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must } = require('../../lib/supabaseQuery')

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

async function answerRisk() {
  const data = await must('predictive_risk_scores', supabase
    .from('predictive_risk_scores')
    .select('predicted_score, threat_level, reasons, agents(name, risk, owner_id)')
    .eq('threat_level', 'CRITICAL')
    .order('predicted_score', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (!data) return null

  return {
    answer: `Your biggest risk is ${data.agents?.name} — a ${data.agents?.risk} agent with a predicted risk score of ${data.predicted_score}. Key reasons: ${data.reasons?.join(', ')}.`,
    entityName: data.agents?.name,
    responsiblePerson: null,
    dataSources: ['predictive_risk_scores', 'agents', 'dependencies']
  }
}

async function answerOwnership() {
  const data = await must('collaboration_scores', supabase
    .from('collaboration_scores')
    .select('dependency_score, critical_agents_owned, has_backup, employees(name, department, role)')
    .order('dependency_score', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (!data) return null

  return {
    answer: `${data.employees?.name} is your most overloaded person. They own ${data.critical_agents_owned} critical agents, have a dependency score of ${data.dependency_score}/100, and ${data.has_backup ? 'have' : 'have no'} backup coverage assigned.`,
    entityName: data.employees?.name,
    responsiblePerson: data.employees?.name,
    dataSources: ['collaboration_scores', 'employee_agent', 'knowledge_assets']
  }
}

async function answerContinuity() {
  const data = await must('workflow_runbooks', supabase
    .from('workflow_runbooks')
    .select('workflow_id, is_documented, owner_id, workflows(name, department), employees(name)')
    .eq('is_documented', false))

  if (!data.length) return null

  const names = data.map(r => r.workflows?.name).filter(Boolean).join(', ')
  const top = data[0]

  return {
    answer: `${data.length} workflows have no documentation or backup: ${names}. The highest risk is ${top.workflows?.name}, owned solely by ${top.employees?.name}.`,
    entityName: top.workflows?.name,
    responsiblePerson: top.employees?.name,
    dataSources: ['workflow_runbooks', 'workflow_failures', 'workflows']
  }
}

async function answerPredictive() {
  const data = await must('predictive_risk_scores', supabase
    .from('predictive_risk_scores')
    .select('predicted_score, threat_level, is_emerging_threat, reasons, agents(name, risk)')
    .eq('is_emerging_threat', true)
    .order('predicted_score', { ascending: false }))

  if (!data.length) return null

  const names = data.map(d => d.agents?.name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} agents are emerging threats predicted to escalate: ${names}. These agents are not yet critical but are trending toward HIGH or CRITICAL risk.`,
    entityName: data[0]?.agents?.name,
    responsiblePerson: null,
    dataSources: ['predictive_risk_scores', 'agents']
  }
}

async function answerGovernance() {
  const data = await must('accountability_scores', supabase
    .from('accountability_scores')
    .select('score, status, same_r_and_a, accountability_entities(entity_name, entity_type)')
    .in('status', ['AT_RISK', 'CRITICAL'])
    .order('score', { ascending: true }))

  if (!data.length) return null

  const names = data.map(d => d.accountability_entities?.entity_name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} entities have governance issues (AT_RISK or CRITICAL accountability status): ${names}. The primary issue is the same person holding both Responsible and Accountable roles.`,
    entityName: data[0]?.accountability_entities?.entity_name,
    responsiblePerson: null,
    dataSources: ['accountability_scores', 'accountability_links']
  }
}

async function answerAccountability() {
  const summary = await must('accountability_summary', supabase
    .from('accountability_summary')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle())

  if (!summary) return null

  return {
    answer: `Your Accountability Score is ${summary.accountability_score}/100 (${summary.status}). ${summary.same_r_and_a_count} of ${summary.total_entities} entities have the same person as Responsible and Accountable — a separation-of-duties violation. Only ${summary.unique_people_count} unique people appear across all responsibility chains, indicating high concentration.`,
    entityName: null,
    responsiblePerson: null,
    dataSources: ['accountability_summary', 'accountability_links']
  }
}

async function answerKnowledge() {
  const data = await must('knowledge_assets', supabase
    .from('knowledge_assets')
    .select('criticality, is_documented, owner_id, employees(name, department)')
    .eq('is_documented', false)
    .eq('criticality', 'critical')
    .limit(1)
    .maybeSingle())

  if (!data) return null

  return {
    answer: `${data.employees?.name} carries the highest knowledge risk. They own critical undocumented assets. If they leave, this knowledge is unrecoverable with no backup path documented.`,
    entityName: data.employees?.name,
    responsiblePerson: data.employees?.name,
    dataSources: ['knowledge_assets', 'employees']
  }
}

async function answerGeneral() {
  const orgScore = await must('intelligence_results', supabase
    .from('intelligence_results')
    .select('score, rating, strengths, weaknesses')
    .eq('result_key', 'org_score')
    .maybeSingle())

  if (!orgScore) {
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
    dataSources: ['intelligence_results']
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

router.get('/ask', async (req, res) => {
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
    const { data, error } = await supabase
      .from('executive_questions')
      .select('question_text, question_type')
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
    const { data, error } = await supabase
      .from('executive_sessions')
      .select('*')
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
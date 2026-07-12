const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

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
  const { data } = await supabase
    .from('predictive_risk_scores')
    .select('predicted_score, threat_level, reasons, agents(name, risk, owner_id)')
    .eq('threat_level', 'CRITICAL')
    .order('predicted_score', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    answer: `Your biggest risk is ${data.agents?.name} — a ${data.agents?.risk} agent with a predicted risk score of ${data.predicted_score}. Key reasons: ${data.reasons?.join(', ')}.`,
    entityName: data.agents?.name,
    responsiblePerson: null,
    dataSources: ['predictive_risk_scores', 'agents', 'dependencies']
  }
}

async function answerOwnership() {
  const { data } = await supabase
    .from('collaboration_scores')
    .select('dependency_score, critical_agents_owned, has_backup, employees(name, department, role)')
    .order('dependency_score', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null

  return {
    answer: `${data.employees?.name} is your most overloaded person. They own ${data.critical_agents_owned} critical agents, have a dependency score of ${data.dependency_score}/100, and ${data.has_backup ? 'have' : 'have no'} backup coverage assigned.`,
    entityName: data.employees?.name,
    responsiblePerson: data.employees?.name,
    dataSources: ['collaboration_scores', 'employee_agent', 'knowledge_assets']
  }
}

async function answerContinuity() {
  const { data } = await supabase
    .from('workflow_runbooks')
    .select('workflow_id, is_documented, owner_id, workflows(name, department), employees(name)')
    .eq('is_documented', false)

  if (!data?.length) return null

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
  const { data } = await supabase
    .from('predictive_risk_scores')
    .select('predicted_score, threat_level, is_emerging_threat, reasons, agents(name, risk)')
    .eq('is_emerging_threat', true)
    .order('predicted_score', { ascending: false })

  if (!data?.length) return null

  const names = data.map(d => d.agents?.name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} agents are emerging threats predicted to escalate: ${names}. These agents are not yet critical but are trending toward HIGH or CRITICAL risk.`,
    entityName: data[0]?.agents?.name,
    responsiblePerson: null,
    dataSources: ['predictive_risk_scores', 'agents']
  }
}

async function answerGovernance() {
  const { data } = await supabase
    .from('accountability_scores')
    .select('score, status, same_r_and_a, accountability_entities(entity_name, entity_type)')
    .in('status', ['AT_RISK', 'CRITICAL'])
    .order('score', { ascending: true })

  if (!data?.length) return null

  const names = data.map(d => d.accountability_entities?.entity_name).filter(Boolean).join(', ')

  return {
    answer: `${data.length} entities have governance issues (AT_RISK or CRITICAL accountability status): ${names}. The primary issue is the same person holding both Responsible and Accountable roles.`,
    entityName: data[0]?.accountability_entities?.entity_name,
    responsiblePerson: null,
    dataSources: ['accountability_scores', 'accountability_links']
  }
}

async function answerAccountability() {
  const { data: summary } = await supabase
    .from('accountability_summary')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(1)
    .single()

  if (!summary) return null

  return {
    answer: `Your Accountability Score is ${summary.accountability_score}/100 (${summary.status}). ${summary.same_r_and_a_count} of ${summary.total_entities} entities have the same person as Responsible and Accountable — a separation-of-duties violation. Only ${summary.unique_people_count} unique people appear across all responsibility chains, indicating high concentration.`,
    entityName: null,
    responsiblePerson: null,
    dataSources: ['accountability_summary', 'accountability_links']
  }
}

async function answerKnowledge() {
  const { data } = await supabase
    .from('knowledge_assets')
    .select('criticality, is_documented, owner_id, employees(name, department)')
    .eq('is_documented', false)
    .eq('criticality', 'critical')
    .limit(1)
    .single()

  if (!data) return null

  return {
    answer: `${data.employees?.name} carries the highest knowledge risk. They own critical undocumented assets. If they leave, this knowledge is unrecoverable with no backup path documented.`,
    entityName: data.employees?.name,
    responsiblePerson: data.employees?.name,
    dataSources: ['knowledge_assets', 'employees']
  }
}

async function answerGeneral() {
  const { data: orgScore } = await supabase
    .from('intelligence_results')
    .select('score, rating, strengths, weaknesses')
    .eq('result_key', 'org_score')
    .single()

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

    // Log session to DB
    await supabase.from('executive_sessions').insert({
      question,
      question_type: questionType,
      answer_summary: result.answer,
      entity_name: result.entityName,
      responsible_person: result.responsiblePerson,
      data_sources: result.dataSources
    })

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

    res.json({
      title: 'Executive Intelligence Briefing',
      generatedAt: new Date().toISOString(),
      findings: [
        { topic: 'Biggest Risk',       ...risk },
        { topic: 'Ownership Load',     ...ownership },
        { topic: 'Continuity Gaps',    ...continuity },
        { topic: 'Governance Issues',  ...governance },
        { topic: 'Accountability',     ...accountability }
      ]
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
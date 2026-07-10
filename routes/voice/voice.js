const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// INTENT CLASSIFICATION
// ─────────────────────────────────────────────

function classifyIntent(query) {
  const q = query.toLowerCase()

  if (
    q.includes('who owns') ||
    q.includes('who is responsible') ||
    q.includes('who manages') ||
    q.includes('who is the owner')
  ) return 'ownership'

  if (
    q.includes('is') && (q.includes('risk') || q.includes('danger') || q.includes('critical')) ||
    q.includes('risk level') ||
    q.includes('how risky') ||
    q.includes('threat')
  ) return 'risk'

  if (
    q.includes('status') ||
    q.includes('running') ||
    q.includes('active') ||
    q.includes('how is') ||
    q.includes('state of')
  ) return 'status'

  return 'general'
}

// ─────────────────────────────────────────────
// ENTITY EXTRACTION
// Simple keyword match against known agents, workflows, tools
// ─────────────────────────────────────────────

async function resolveEntity(query) {
  const q = query.toLowerCase()

  // Load all known entity names from three tables
  const [agents, workflows, tools] = await Promise.all([
    supabase.from('agents').select('id, name, status, risk, owner_id'),
    supabase.from('workflows').select('id, name, status, risk'),
    supabase.from('ai_platforms').select('id, name, status')
  ])

  // Check agents
  const matchedAgent = agents.data?.find(a => q.includes(a.name.toLowerCase()))
  if (matchedAgent) return { entity: matchedAgent, entityType: 'agent' }

  // Check workflows
  const matchedWorkflow = workflows.data?.find(w => q.includes(w.name.toLowerCase()))
  if (matchedWorkflow) return { entity: matchedWorkflow, entityType: 'workflow' }

  // Check tools
  const matchedTool = tools.data?.find(t => q.includes(t.name.toLowerCase()))
  if (matchedTool) return { entity: matchedTool, entityType: 'tool' }

  return { entity: null, entityType: null }
}

// ─────────────────────────────────────────────
// ANSWER BUILDERS PER INTENT
// ─────────────────────────────────────────────

async function buildOwnershipAnswer(entity, entityType) {
  if (!entity) {
    return {
      answer: 'I could not identify which entity you are asking about. Please name a specific agent, workflow, or tool.',
      confidence: 'LOW'
    }
  }

  // For agents — look up employee via employee_agent
  if (entityType === 'agent') {
    const { data: link } = await supabase
      .from('employee_agent')
      .select('role, employees(name, department, risk)')
      .eq('agent_id', entity.id)
      .single()

    const { data: knowledge } = await supabase
      .from('knowledge_assets')
      .select('is_documented, criticality')
      .eq('asset_type', 'agent')
      .eq('asset_id', entity.id)
      .single()

    if (!link) {
      return {
        answer: `${entity.name} has no owner assigned. It is currently orphaned, which makes it a high operational risk.`,
        confidence: 'HIGH'
      }
    }

    const owner = link.employees
    const documented = knowledge?.is_documented ? 'documented' : 'undocumented'
    const hasBackup = owner?.risk !== 'high' ? 'backup coverage exists' : 'no backup owner assigned'

    return {
      answer: `${entity.name} is owned by ${owner?.name} from ${owner?.department}. The agent is ${documented} and ${hasBackup}. Current risk level is ${entity.risk}.`,
      confidence: 'HIGH'
    }
  }

  // For workflows — look up via workflow_runbooks
  if (entityType === 'workflow') {
    const { data: runbook } = await supabase
      .from('workflow_runbooks')
      .select('is_documented, employees(name, department)')
      .eq('workflow_id', entity.id)
      .single()

    if (!runbook) {
      return {
        answer: `${entity.name} has no documented owner in the system. This workflow is untracked.`,
        confidence: 'MEDIUM'
      }
    }

    const owner = runbook.employees
    const documented = runbook.is_documented ? 'fully documented' : 'undocumented'

    return {
      answer: `${entity.name} is owned by ${owner?.name}. The workflow is ${documented}. Current status is ${entity.status}.`,
      confidence: 'HIGH'
    }
  }

  // For tools — look up via agent_platform / knowledge_assets
  if (entityType === 'tool') {
    const { data: knowledge } = await supabase
      .from('knowledge_assets')
      .select('is_documented, owner_id, employees(name, department)')
      .eq('asset_type', 'platform')
      .eq('asset_id', entity.id)
      .single()

    if (!knowledge) {
      return {
        answer: `${entity.name} has no documented owner. This platform carries untracked operational risk.`,
        confidence: 'MEDIUM'
      }
    }

    return {
      answer: `${entity.name} is managed by ${knowledge.employees?.name} from ${knowledge.employees?.department}. Documentation status: ${knowledge.is_documented ? 'documented' : 'undocumented'}.`,
      confidence: 'HIGH'
    }
  }

  return { answer: 'Ownership data not found.', confidence: 'LOW' }
}

async function buildRiskAnswer(entity, entityType) {
  if (!entity) {
    return {
      answer: 'I could not identify the entity you are asking about. Please name a specific agent, workflow, or tool.',
      confidence: 'LOW'
    }
  }

  if (entityType === 'agent') {
    const { data: prediction } = await supabase
      .from('predictive_risk_scores')
      .select('predicted_score, threat_level, reasons, is_emerging_threat')
      .eq('agent_id', entity.id)
      .single()

    const { data: knowledge } = await supabase
      .from('knowledge_assets')
      .select('is_documented, criticality')
      .eq('asset_type', 'agent')
      .eq('asset_id', entity.id)
      .single()

    const documented = knowledge?.is_documented ? 'documented' : 'undocumented'
    const emerging = prediction?.is_emerging_threat ? ' It is flagged as an emerging threat.' : ''
    const reasons = prediction?.reasons?.join(', ') ?? 'insufficient data'

    if (prediction) {
      return {
        answer: `${entity.name} has a predicted risk score of ${prediction.predicted_score} out of 100, classified as ${prediction.threat_level}. It is ${documented}.${emerging} Key risk drivers: ${reasons}.`,
        confidence: 'HIGH'
      }
    }

    return {
      answer: `${entity.name} has a current risk level of ${entity.risk} and is ${documented}. No predictive score has been computed yet.`,
      confidence: 'MEDIUM'
    }
  }

  if (entityType === 'workflow') {
    const { data: failures } = await supabase
      .from('workflow_failures')
      .select('failure_type, severity, description')
      .eq('workflow_id', entity.id)
      .eq('severity', 'critical')

    const criticalCount = failures?.length ?? 0

    return {
      answer: `${entity.name} has a risk level of ${entity.risk}. There are ${criticalCount} critical failure points recorded. Status: ${entity.status}.`,
      confidence: 'HIGH'
    }
  }

  return {
    answer: `${entity.name} has a status of ${entity.status}. No detailed risk model is available for this entity type yet.`,
    confidence: 'MEDIUM'
  }
}

async function buildStatusAnswer(entity, entityType) {
  if (!entity) {
    return {
      answer: 'I could not identify which entity you are asking about. Please name a specific agent, workflow, or tool.',
      confidence: 'LOW'
    }
  }

  if (entityType === 'workflow') {
    const { data: orchestration } = await supabase
      .from('workflow_orchestration')
      .select('current_step, total_steps, status')
      .eq('workflow_id', entity.id)
      .single()

    const stepInfo = orchestration
      ? `Currently on step ${orchestration.current_step} of ${orchestration.total_steps}.`
      : ''

    const blocked = orchestration?.status === 'BLOCKED'
      ? ' Warning: this workflow is BLOCKED due to an actor collision.'
      : ''

    return {
      answer: `${entity.name} is ${entity.status?.toUpperCase()}. Risk level: ${entity.risk}. ${stepInfo}${blocked}`,
      confidence: 'HIGH'
    }
  }

  if (entityType === 'agent') {
    return {
      answer: `${entity.name} is currently ${entity.status?.toUpperCase()} with a risk level of ${entity.risk}.`,
      confidence: 'HIGH'
    }
  }

  return {
    answer: `${entity.name} is currently ${entity.status?.toUpperCase()}.`,
    confidence: 'HIGH'
  }
}

async function buildGeneralAnswer(query) {
  const q = query.toLowerCase()

  // Delegate to known patterns
  if (q.includes('overload') || q.includes('too much') || q.includes('busiest')) {
    const { data } = await supabase
      .from('collaboration_scores')
      .select('dependency_score, critical_agents_owned, employees(name, department)')
      .order('dependency_score', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      return {
        answer: `${data.employees?.name} is the most overloaded person. They carry ${data.critical_agents_owned} critical agents and have a dependency score of ${data.dependency_score} out of 100.`,
        confidence: 'HIGH'
      }
    }
  }

  if (q.includes('biggest risk') || q.includes('top risk')) {
    const { data } = await supabase
      .from('predictive_risk_scores')
      .select('predicted_score, reasons, agents(name)')
      .eq('threat_level', 'CRITICAL')
      .order('predicted_score', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      return {
        answer: `Your biggest risk is ${data.agents?.name} with a predicted score of ${data.predicted_score} out of 100. Reasons: ${data.reasons?.join(', ')}.`,
        confidence: 'HIGH'
      }
    }
  }

  if (q.includes('summary') || q.includes('overview') || q.includes('brief')) {
    const { data: summary } = await supabase
      .from('voice_daily_summary')
      .select('summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (summary) {
      return { answer: summary.summary, confidence: 'HIGH' }
    }
  }

  // Org score fallback
  const { data: orgScore } = await supabase
    .from('intelligence_results')
    .select('score, rating')
    .eq('result_key', 'org_score')
    .single()

  if (orgScore) {
    return {
      answer: `Your overall Organizational Intelligence Score is ${orgScore.score} out of 100, rated ${orgScore.rating}. Ask me about specific agents, workflows, or people for more detail.`,
      confidence: 'MEDIUM'
    }
  }

  return {
    answer: 'I could not find a specific answer for that question. Try asking about ownership, risk, or status of a specific agent or workflow.',
    confidence: 'LOW'
  }
}

// ─────────────────────────────────────────────
// GET /api/voice/intents
// ─────────────────────────────────────────────

router.get('/intents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('voice_intents')
      .select('intent_name, example_query')
      .order('intent_name')

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/voice/history
// ─────────────────────────────────────────────

router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('voice_history')
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
// GET /api/voice/daily-summary
// ─────────────────────────────────────────────

router.get('/daily-summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('voice_daily_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw new Error(error.message)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/voice/ask?q=
// ─────────────────────────────────────────────

router.get('/ask', async (req, res) => {
  try {
    const query = req.query.q
    if (!query) return res.status(400).json({ error: 'Provide a query using ?q=' })

    const intent = classifyIntent(query)
    const { entity, entityType } = await resolveEntity(query)

    let result

    if (intent === 'ownership') result = await buildOwnershipAnswer(entity, entityType)
    else if (intent === 'risk')   result = await buildRiskAnswer(entity, entityType)
    else if (intent === 'status') result = await buildStatusAnswer(entity, entityType)
    else                          result = await buildGeneralAnswer(query)

    // Log to history
    await supabase.from('voice_history').insert({
      query,
      detected_intent: intent,
      resolved_entity: entity?.name ?? null,
      entity_type: entityType,
      answer: result.answer,
      confidence: result.confidence
    })

    res.json({
      query,
      detectedIntent: intent,
      resolvedEntity: entity?.name ?? null,
      entityType,
      answer: result.answer,
      confidence: result.confidence
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
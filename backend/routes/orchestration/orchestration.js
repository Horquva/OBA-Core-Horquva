const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchOrchestrationWithCurrentStep() {
  const { data: orchestrations, error } = await supabase
    .from('workflow_orchestration')
    .select(`
      id,
      workflow_id,
      current_step,
      total_steps,
      status,
      updated_at,
      workflows ( name, department )
    `)

  if (error) throw new Error(error.message)

  // Attach the step record matching current_step for each workflow — one
  // batched fetch across every workflow_id involved, not one query per
  // orchestration row.
  const workflowIds = [...new Set(orchestrations.map(o => o.workflow_id))]
  const { data: steps, error: stepsError } = workflowIds.length
    ? await supabase
        .from('workflow_steps')
        .select('workflow_id, step_number, step_name, actor_type, actor_name, is_required')
        .in('workflow_id', workflowIds)
    : { data: [], error: null }
  if (stepsError) throw new Error(stepsError.message)

  const stepByKey = new Map((steps || []).map(s => [`${s.workflow_id}:${s.step_number}`, s]))

  return orchestrations.map(o => ({
    ...o,
    currentStepDetails: stepByKey.get(`${o.workflow_id}:${o.current_step}`) ?? null,
  }))
}

function detectCollisions(orchestrations) {
  const actorMap = {}

  orchestrations.forEach(o => {
    const actor = o.currentStepDetails?.actor_name
    if (!actor) return
    if (!actorMap[actor]) actorMap[actor] = []
    actorMap[actor].push(o)
  })

  const collisions = Object.entries(actorMap)
    .filter(([_, workflows]) => workflows.length >= 2)
    .map(([actorName, workflows]) => ({
      actorName,
      actorType: workflows[0].currentStepDetails?.actor_type,
      conflictingWorkflows: workflows.map(w => ({
        workflowId: w.workflow_id,
        workflowName: w.workflows?.name,
        currentStep: w.current_step,
        totalSteps: w.total_steps
      }))
    }))

  return collisions
}

function markBlockedWorkflows(orchestrations, collisions) {
  const blockedWorkflowIds = new Set()

  collisions.forEach(c => {
    c.conflictingWorkflows.forEach(w => blockedWorkflowIds.add(w.workflowId))
  })

  return orchestrations.map(o => ({
    ...o,
    isBlocked: blockedWorkflowIds.has(o.workflow_id)
  }))
}

// ─────────────────────────────────────────────
// GET /api/orchestration/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const orchestrations = await fetchOrchestrationWithCurrentStep()
    const collisions = detectCollisions(orchestrations)
    const withBlocked = markBlockedWorkflows(orchestrations, collisions)

    const blockedCount = withBlocked.filter(w => w.isBlocked).length

    res.json({
      totalWorkflowsOrchestrated: orchestrations.length,
      totalCollisions: collisions.length,
      blockedWorkflows: blockedCount
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/orchestration/workflows
// ─────────────────────────────────────────────

router.get('/workflows', async (req, res) => {
  try {
    const orchestrations = await fetchOrchestrationWithCurrentStep()
    const collisions = detectCollisions(orchestrations)
    const withBlocked = markBlockedWorkflows(orchestrations, collisions)

    const formatted = withBlocked.map(o => ({
      workflowName: o.workflows?.name,
      department: o.workflows?.department,
      currentStep: o.current_step,
      totalSteps: o.total_steps,
      status: o.isBlocked ? 'BLOCKED' : o.status,
      nextActor: o.currentStepDetails
        ? {
            name: o.currentStepDetails.actor_name,
            type: o.currentStepDetails.actor_type,
            stepName: o.currentStepDetails.step_name
          }
        : null,
      updatedAt: o.updated_at
    }))

    res.json(formatted)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/orchestration/collisions
// ─────────────────────────────────────────────

router.get('/collisions', async (req, res) => {
  try {
    const orchestrations = await fetchOrchestrationWithCurrentStep()
    const collisions = detectCollisions(orchestrations)

    res.json({
      totalCollisions: collisions.length,
      collisions
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/orchestration/blocked
// ─────────────────────────────────────────────

router.get('/blocked', async (req, res) => {
  try {
    const orchestrations = await fetchOrchestrationWithCurrentStep()
    const collisions = detectCollisions(orchestrations)
    const withBlocked = markBlockedWorkflows(orchestrations, collisions)

    const blocked = withBlocked
      .filter(w => w.isBlocked)
      .map(o => ({
        workflowName: o.workflows?.name,
        department: o.workflows?.department,
        currentStep: o.current_step,
        totalSteps: o.total_steps,
        blockedActor: o.currentStepDetails?.actor_name ?? null,
        reason: 'Actor required by multiple workflows at the same time'
      }))

    res.json({
      totalBlocked: blocked.length,
      blockedWorkflows: blocked
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/orchestration/mode — current execution mode (advisory by default)
// ─────────────────────────────────────────────

router.get('/mode', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('execution_mode')
      .select('mode')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fail open to the safe 'advisory' default either way, but a real query
    // error (bad credentials, dropped table) must still be visible in the log —
    // otherwise an outage here is indistinguishable from "no mode set yet".
    if (error) console.warn(`[supabase] optional read failed — execution_mode: ${error.message}`)
    if (error || !data) return res.json({ executionMode: 'advisory' })
    res.json({ executionMode: data.mode })
  } catch (err) {
    console.warn(`[supabase] optional read failed — execution_mode: ${err.message}`)
    res.json({ executionMode: 'advisory' })
  }
})

module.exports = router
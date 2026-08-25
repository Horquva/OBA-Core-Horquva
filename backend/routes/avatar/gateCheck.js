const supabase = require('../../supabase')

// M15 Verification + M16 Orchestration gate for the Executive Avatar.
//
// This used to read `verification_logs` and `orchestration_state` — the 2-row
// shadow tables from schema.sql, keyed by text ids like 'wf_001'. Live workflows
// are integer-keyed, so no real workflow ever matched: every check pushed
// no_orchestration_record and forced can_act:false. Now reads the populated
// tables (verification_actions, workflow_orchestration, workflow_steps).
//
// `workflow_orchestration` has no collision_detected column, so collision is
// derived the same way /api/orchestration/collisions derives it: two or more
// in-flight workflows whose current step needs the same actor.

async function currentStepActor(workflow_id, step_number) {
  const { data, error } = await supabase
    .from('workflow_steps')
    .select('actor_name, actor_type')
    .eq('workflow_id', workflow_id)
    .eq('step_number', step_number)
    .maybeSingle()

  if (error) throw new Error(`Workflow step lookup failed: ${error.message}`)
  return data
}

async function detectActorCollision(orchState) {
  const step = await currentStepActor(orchState.workflow_id, orchState.current_step)
  if (!step?.actor_name) return null

  const { data: inFlight, error } = await supabase
    .from('workflow_orchestration')
    .select('workflow_id, current_step')
    .eq('status', 'in_progress')

  if (error) throw new Error(`Orchestration scan failed: ${error.message}`)

  const others = (inFlight || []).filter((o) => o.workflow_id !== orchState.workflow_id)
  if (!others.length) return null

  // One batched fetch across every competing workflow's steps instead of one
  // query per candidate — this sits on the synchronous gate-check path that
  // auto-escalates on failure, so its latency scales with however many
  // workflows happen to be in flight at once.
  const otherIds = [...new Set(others.map((o) => o.workflow_id))]
  const { data: steps, error: stepsError } = await supabase
    .from('workflow_steps')
    .select('workflow_id, step_number, actor_name')
    .in('workflow_id', otherIds)

  if (stepsError) throw new Error(`Workflow step lookup failed: ${stepsError.message}`)

  const stepByKey = new Map((steps || []).map((s) => [`${s.workflow_id}:${s.step_number}`, s]))
  const competing = others
    .filter((o) => stepByKey.get(`${o.workflow_id}:${o.current_step}`)?.actor_name === step.actor_name)
    .map((o) => o.workflow_id)

  if (!competing.length) return null
  return {
    actor_name: step.actor_name,
    actor_type: step.actor_type,
    competing_workflow_ids: competing,
  }
}

async function checkGate(workflow_id) {
  const id = Number(workflow_id)
  if (!Number.isInteger(id)) {
    throw new Error(`workflow_id must be an integer workflow id, got '${workflow_id}'`)
  }

  const { data: verifications, error: vErr } = await supabase
    .from('verification_actions')
    .select('*')
    .eq('workflow_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (vErr) throw new Error(`Verification lookup failed: ${vErr.message}`)

  const { data: orchestration, error: oErr } = await supabase
    .from('workflow_orchestration')
    .select('*')
    .eq('workflow_id', id)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (oErr) throw new Error(`Orchestration lookup failed: ${oErr.message}`)

  const verification = verifications?.[0] || null
  const orchState = orchestration?.[0] || null

  const reasons = []

  if (!verification) reasons.push('no_verification_record')
  else {
    if (verification.verification_status !== 'COMPLETED') reasons.push('not_verified')
    if (verification.policy_compliant === false) reasons.push('policy_violation')
    if (verification.verification_status === 'FLAGGED') reasons.push('flagged')
    if (verification.verification_status === 'FAILED') reasons.push('failed')
  }

  let collision = null
  if (!orchState) reasons.push('no_orchestration_record')
  else {
    if (orchState.status === 'blocked') reasons.push('orchestration_blocked')
    collision = await detectActorCollision(orchState)
    if (collision) reasons.push('collision_detected')
  }

  return {
    workflow_id: id,
    can_act: reasons.length === 0,
    reasons,
    verification,
    orchestration: orchState ? { ...orchState, collision } : null,
  }
}

module.exports = { checkGate }

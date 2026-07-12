const supabase = require('../../supabase')
const { getCurrentMode } = require('./intentReceiver')

async function executeIntent(intent_id) {
  // Get the intent
  const { data: intents, error: fetchError } = await supabase
    .from('execution_intents')
    .select('*')
    .eq('intent_id', intent_id)
    .limit(1)

  if (fetchError) throw new Error(`Failed to fetch intent: ${fetchError.message}`)
  const intent = intents?.[0]
  if (!intent) throw new Error(`Intent ${intent_id} not found`)

  // Check current mode
  const mode = await getCurrentMode()

  // Block execution in advisory mode
  if (mode === 'advisory') {
    return {
      intent_id,
      executed: false,
      reason: 'System is in advisory mode. No actions are executed automatically.',
      mode
    }
  }

  // Block if intent is not approved
  if (intent.status !== 'approved') {
    return {
      intent_id,
      executed: false,
      reason: `Intent status is '${intent.status}'. Only approved intents can be executed.`,
      mode
    }
  }

  // Execute — update orchestration_state based on intent action
  let executionResult = null

  if (intent.workflow_id) {
    const updates = buildWorkflowUpdate(intent)

    const { data, error } = await supabase
      .from('orchestration_state')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('workflow_id', intent.workflow_id)
      .select()

    if (error) throw new Error(`Execution failed: ${error.message}`)
    executionResult = data?.[0]
  }

  // Mark intent as executed
  await supabase
    .from('execution_intents')
    .update({ status: 'executed' })
    .eq('intent_id', intent_id)

  return {
    intent_id,
    executed: true,
    mode,
    action: intent.action,
    workflow_id: intent.workflow_id,
    result: executionResult,
    message: `Intent executed successfully under ${mode} mode.`
  }
}

function buildWorkflowUpdate(intent) {
  switch (intent.intent_type) {
    case 'unblock_workflow':
      return { status: 'running', collision_detected: false, collision_detail: null }
    case 'pause_workflow':
      return { status: 'paused' }
    case 'resume_workflow':
      return { status: 'running' }
    case 'reassign_actor':
      return {
        next_actor_name: intent.payload?.new_actor_name || null,
        next_actor_type: intent.payload?.new_actor_type || null
      }
    default:
      return {}
  }
}

async function approveIntent(intent_id) {
  const { data, error } = await supabase
    .from('execution_intents')
    .update({ status: 'approved' })
    .eq('intent_id', intent_id)
    .select()

  if (error) throw new Error(`Approval failed: ${error.message}`)
  return data?.[0]
}

async function rejectIntent(intent_id) {
  const { data, error } = await supabase
    .from('execution_intents')
    .update({ status: 'rejected' })
    .eq('intent_id', intent_id)
    .select()

  if (error) throw new Error(`Rejection failed: ${error.message}`)
  return data?.[0]
}

module.exports = { executeIntent, approveIntent, rejectIntent }
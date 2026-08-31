const supabase = require('../../supabase')

async function getCurrentMode() {
  const { data, error } = await supabase
    .from('execution_mode')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to get execution mode: ${error.message}`)
  return data?.[0]?.mode || 'advisory'
}

async function receiveIntent(intent) {
  const {
    source_module,
    intent_type,
    workflow_id,
    action,
    reasoning,
    payload
  } = intent

  if (!source_module || !intent_type || !action) {
    throw new Error('Missing required intent fields: source_module, intent_type, action')
  }

  const mode = await getCurrentMode()
  const intent_id = `intent_${Date.now()}`

  // In advisory mode — store as advisory, no execution
  // In assisted mode — store as pending, wait for human approval
  // In governed_autonomous / fully_autonomous — store as approved, ready to execute
  const status = mode === 'advisory' ? 'advisory'
    : mode === 'assisted' ? 'pending'
    : 'approved'

  const { data, error } = await supabase
    .from('execution_intents')
    .insert([{
      intent_id,
      source_module,
      intent_type,
      workflow_id: workflow_id || null,
      action,
      reasoning,
      payload: payload || {},
      status,
      execution_mode: mode
    }])
    .select()

  if (error) throw new Error(`Failed to store intent: ${error.message}`)

  return {
    intent: data[0],
    mode,
    message: mode === 'advisory'
      ? 'Intent logged in advisory mode. No action will be taken automatically.'
      : mode === 'assisted'
      ? 'Intent logged. Waiting for human approval before execution.'
      : 'Intent approved for autonomous execution.'
  }
}

module.exports = { receiveIntent, getCurrentMode }
const INTENT_PATTERNS = [
  {
    intent: 'check_status',
    patterns: ['check', 'status', 'what is', 'how is', 'show me'],
    action: 'workflow_status_check'
  },
  {
    intent: 'escalate',
    patterns: ['escalate', 'flag', 'raise', 'urgent', 'critical', 'blocked'],
    action: 'workflow_escalation'
  },
  {
    intent: 'approve',
    patterns: ['approve', 'confirm', 'authorize', 'allow', 'proceed'],
    action: 'workflow_approval'
  },
  {
    intent: 'pause',
    patterns: ['pause', 'stop', 'hold', 'suspend', 'wait'],
    action: 'workflow_pause'
  },
  {
    intent: 'resume',
    patterns: ['resume', 'continue', 'restart', 'start again', 'unpause'],
    action: 'workflow_resume'
  }
]

function extractWorkflowId(transcript) {
  const match = transcript.match(/wf_\d+/i)
  return match ? match[0].toLowerCase() : null
}

function parseIntent(transcript) {
  const lower = transcript.toLowerCase()

  let matchedIntent = null
  let matchedAction = null
  let highestScore = 0

  for (const item of INTENT_PATTERNS) {
    const score = item.patterns.filter(p => lower.includes(p)).length
    if (score > highestScore) {
      highestScore = score
      matchedIntent = item.intent
      matchedAction = item.action
    }
  }

  const workflow_id = extractWorkflowId(transcript)

  if (!matchedIntent) {
    return {
      intent: 'unknown',
      action: null,
      workflow_id,
      confidence: 'low',
      transcript,
      signal: null
    }
  }

  return {
    intent: matchedIntent,
    action: matchedAction,
    workflow_id,
    confidence: highestScore >= 2 ? 'high' : 'medium',
    transcript,
    signal: {
      type: matchedAction,
      workflow_id,
      source: 'voice',
      requires_gate_check: true
    }
  }
}

module.exports = { parseIntent }
// backend/agent/persistence.js
//
// Reads and writes sql/15_agent_layer.sql's four tables
// (agent_conversations, agent_messages, agent_tool_calls, agent_usage).
// That migration landed months before this file did -- the route never
// wrote to it, so every conversation lived only in the browser tab that
// started it. This is the wiring that was always missing.
//
// Every write here happens AFTER the SSE response the user is looking at
// has already been sent (chat.js calls saveTurn() in the background, not
// awaited on the critical path). A persistence failure must never turn a
// successful turn into a failed request -- it's logged and swallowed.

'use strict'

const supabase = require('../supabase')

const TITLE_MAX_LENGTH = 60

function deriveTitle(firstUserMessage) {
  const trimmed = (firstUserMessage || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'New conversation'
  return trimmed.length > TITLE_MAX_LENGTH
    ? trimmed.slice(0, TITLE_MAX_LENGTH - 1).trimEnd() + '…'
    : trimmed
}

/**
 * @param {string} userId
 * @param {number} [limit]
 * @returns {Promise<Array<{id:string, title:string, createdAt:string, lastMessageAt:string}>>}
 */
async function listConversations(userId, limit = 50) {
  const { data, error } = await supabase
    .from('agent_conversations')
    .select('id, title, created_at, last_message_at')
    .eq('user_id', userId)
    .eq('archived', false)
    .order('last_message_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`persistence: could not list conversations — ${error.message}`)

  return (data || []).map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    lastMessageAt: row.last_message_at,
  }))
}

/**
 * Full message history for one conversation, reshaped into the exact
 * frontend Message[] shape (AgentProvider.tsx's own interface) so the
 * client can RESTORE_CONVERSATION with it unmodified.
 *
 * @param {string} userId    only this user's own conversation is readable
 * @param {string} conversationId
 * @returns {Promise<{id:string, title:string, messages:Array}|null>}  null when not found/not owned
 */
async function getConversation(userId, conversationId) {
  const { data: convo, error: convoError } = await supabase
    .from('agent_conversations')
    .select('id, title, user_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (convoError) throw new Error(`persistence: could not read conversation — ${convoError.message}`)
  if (!convo || convo.user_id !== userId) return null

  const { data: rows, error: msgError } = await supabase
    .from('agent_messages')
    .select('id, turn, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('turn', { ascending: true })
    .order('id', { ascending: true })

  if (msgError) throw new Error(`persistence: could not read messages — ${msgError.message}`)

  const assistantIds = (rows || []).filter((r) => r.role === 'assistant').map((r) => r.id)
  const toolCallsByMessage = new Map()
  if (assistantIds.length) {
    const { data: toolRows, error: toolError } = await supabase
      .from('agent_tool_calls')
      .select('id, message_id, tool_name, input, result_summary, duration_ms, error')
      .in('message_id', assistantIds)

    if (toolError) throw new Error(`persistence: could not read tool calls — ${toolError.message}`)
    for (const t of toolRows || []) {
      if (!toolCallsByMessage.has(t.message_id)) toolCallsByMessage.set(t.message_id, [])
      toolCallsByMessage.get(t.message_id).push({
        id: String(t.id),
        name: t.tool_name,
        label: t.input?.label ?? t.tool_name.replace(/_/g, ' '),
        status: 'done',
        summary: t.error ? `error: ${t.error}` : (t.result_summary?.summary ?? null),
        durationMs: t.duration_ms ?? null,
      })
    }
  }

  const messages = (rows || []).map((row) => {
    const content = row.content || {}
    const base = {
      id: String(row.id),
      role: row.role,
      content: content.text ?? '',
      timestamp: row.created_at,
    }
    if (row.role === 'assistant') {
      return {
        ...base,
        toolCalls: toolCallsByMessage.get(row.id) ?? [],
        validatorStatus: content.validatorStatus,
        navigationOffers: content.navigationOffers,
        provenance: content.provenance,
        usage: content.usage,
      }
    }
    return base
  })

  return { id: convo.id, title: convo.title, messages }
}

/**
 * Resolve the conversation id for a turn BEFORE it runs, so the `ready` SSE
 * event can hand back a real, persisted id instead of just echoing whatever
 * the client sent (which is what this route used to do -- conversationId
 * was never actually assigned server-side, so continuity relied entirely on
 * the client's own in-memory `history` array).
 *
 * A requested id that doesn't exist or belongs to a different user is never
 * trusted silently -- it starts a fresh conversation instead of either
 * erroring the turn or letting one user's messages land in another user's
 * conversation.
 *
 * @returns {Promise<string>} always a real, owned conversation id
 */
async function resolveConversation({ userId, requestedId, firstMessage }) {
  if (requestedId) {
    const { data: existing, error } = await supabase
      .from('agent_conversations')
      .select('id, user_id')
      .eq('id', requestedId)
      .maybeSingle()
    if (!error && existing && existing.user_id === userId) {
      return existing.id
    }
  }

  const { data: created, error: createError } = await supabase
    .from('agent_conversations')
    .insert({ user_id: userId, title: deriveTitle(firstMessage) })
    .select('id')
    .single()
  if (createError) throw new Error(`persistence: could not create conversation — ${createError.message}`)
  return created.id
}

/**
 * Persist one completed turn (a user message plus the assistant's reply)
 * onto an ALREADY-RESOLVED conversation id (see resolveConversation).
 * Never throws into the caller -- chat.js fires this after the SSE `done`
 * event and must not let a persistence hiccup look like a turn failure.
 */
async function saveTurn({ userId, conversationId, userMessage, result, provenance }) {
  const convoId = conversationId
  try {
    const { data: lastTurnRow } = await supabase
      .from('agent_messages')
      .select('turn')
      .eq('conversation_id', convoId)
      .order('turn', { ascending: false })
      .limit(1)
      .maybeSingle()
    const turn = (lastTurnRow?.turn ?? 0) + 1

    const { error: userInsertError } = await supabase.from('agent_messages').insert({
      conversation_id: convoId,
      turn,
      role: 'user',
      content: { text: userMessage },
      snapshot_at: provenance?.snapshotAt ?? null,
      graph_loaded_at: provenance?.graphSource?.loadedAt ?? null,
    })
    if (userInsertError) throw userInsertError

    const { data: assistantRow, error: assistantInsertError } = await supabase
      .from('agent_messages')
      .insert({
        conversation_id: convoId,
        turn,
        role: 'assistant',
        content: {
          text: result?.text ?? '',
          validatorStatus: result?.validatorStatus ?? null,
          navigationOffers: result?.navigationOffers ?? [],
          provenance: provenance ?? null,
          usage: result?.usage ?? null,
        },
        snapshot_at: provenance?.snapshotAt ?? null,
        graph_loaded_at: provenance?.graphSource?.loadedAt ?? null,
      })
      .select('id')
      .single()
    if (assistantInsertError) throw assistantInsertError

    const toolTrace = result?.toolTrace ?? []
    if (toolTrace.length) {
      const toolRows = toolTrace.map((call) => ({
        message_id: assistantRow.id,
        tool_name: call.name,
        input: { ...(call.args ?? {}), label: call.label },
        result_summary: { summary: call.summary ?? null },
        duration_ms: call.durationMs ?? null,
        error: call.toolError ?? null,
      }))
      const { error: toolInsertError } = await supabase.from('agent_tool_calls').insert(toolRows)
      if (toolInsertError) throw toolInsertError
    }

    if (result?.usage) {
      await supabase.from('agent_usage').insert({
        conversation_id: convoId,
        user_id: userId,
        provider: process.env.AGENT_PROVIDER || 'gemini',
        model: process.env.AGENT_MODEL || 'unknown',
        input_tokens: result.usage.inputTokens ?? 0,
        output_tokens: result.usage.outputTokens ?? 0,
        provider_calls: result.usage.providerCalls ?? result.iterations ?? 0,
        tool_iterations: result.iterations ?? 0,
        validator_status: result.validatorStatus ?? null,
      })
    }

    await supabase
      .from('agent_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', convoId)

    return convoId
  } catch (err) {
    console.error('[agent/persistence] saveTurn failed:', err.message)
    return null
  }
}

module.exports = { listConversations, getConversation, resolveConversation, saveTurn, deriveTitle }

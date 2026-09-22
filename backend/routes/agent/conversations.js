// backend/routes/agent/conversations.js
//
// Read-only history for sql/15_agent_layer.sql's tables, now that chat.js
// actually writes to them (agent/persistence.js). Separate from chat.js's
// streaming POST /chat on purpose -- this is plain request/response JSON,
// not SSE.

const express = require('express')
const { listConversations, getConversation } = require('../../agent/persistence')

const router = express.Router()

router.get('/conversations', async (req, res) => {
  try {
    const conversations = await listConversations(req.user.sub)
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: 'Unable to list conversations' })
  }
})

router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await getConversation(req.user.sub, req.params.id)
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' })
    }
    res.json(conversation)
  } catch (err) {
    res.status(500).json({ error: 'Unable to load conversation' })
  }
})

module.exports = router

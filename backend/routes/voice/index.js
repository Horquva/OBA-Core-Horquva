const express = require('express')
const router = express.Router()
const { transcribeAudio, transcribeText } = require('./stt')
const { parseIntent } = require('./intentParser')
const { checkGate } = require('../avatar/gateCheck')
const { escalate } = require('../avatar/escalate')

// POST /api/voice/transcribe — convert text or audio to transcript
router.post('/transcribe', async (req, res) => {
  try {
    const { text } = req.body

    if (text) {
      const result = await transcribeText(text)
      return res.json(result)
    }

    if (req.body.audio) {
      const audioBuffer = Buffer.from(req.body.audio, 'base64')
      const result = await transcribeAudio(audioBuffer)
      return res.json(result)
    }

    return res.status(400).json({ error: 'Provide either text or base64 audio' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/intent — parse transcript into structured signal
router.post('/intent', async (req, res) => {
  try {
    const { transcript } = req.body

    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' })
    }

    const result = parseIntent(transcript)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/voice/command — full pipeline: transcript → intent → gate check → escalate if needed
router.post('/command', async (req, res) => {
  try {
    const { text, audio } = req.body

    // Step 1: get transcript
    let sttResult
    if (text) {
      sttResult = await transcribeText(text)
    } else if (audio) {
      const audioBuffer = Buffer.from(audio, 'base64')
      sttResult = await transcribeAudio(audioBuffer)
    } else {
      return res.status(400).json({ error: 'Provide either text or base64 audio' })
    }

    // Step 2: parse intent
    const intentResult = parseIntent(sttResult.transcript)

    if (intentResult.intent === 'unknown') {
      return res.json({
        transcript: sttResult.transcript,
        source: sttResult.source,
        intent: 'unknown',
        message: 'Could not understand the command. Please try again.',
        gate: null,
        escalation: null
      })
    }

    // Step 3: gate check if workflow_id found
    if (!intentResult.workflow_id) {
      return res.json({
        transcript: sttResult.transcript,
        source: sttResult.source,
        intent: intentResult.intent,
        action: intentResult.action,
        message: 'Intent recognized but no workflow ID found in command.',
        gate: null,
        escalation: null
      })
    }

    // Step 4: run gate check against M15 + M16
    const gateResult = await checkGate(intentResult.workflow_id)

    if (gateResult.can_act) {
      return res.json({
        transcript: sttResult.transcript,
        source: sttResult.source,
        intent: intentResult.intent,
        action: intentResult.action,
        workflow_id: intentResult.workflow_id,
        message: 'Command cleared. Executive Avatar may proceed.',
        gate: gateResult,
        escalation: null
      })
    }

    // Step 5: escalate if gate fails
    const escalation = await escalate(gateResult)

    res.json({
      transcript: sttResult.transcript,
      source: sttResult.source,
      intent: intentResult.intent,
      action: intentResult.action,
      workflow_id: intentResult.workflow_id,
      message: escalation.message,
      gate: gateResult,
      escalation
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
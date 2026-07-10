const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')
const eventBus = require('../../services/eventBus')

// ─────────────────────────────────────────────
// GET /api/events
// Recent events, filterable by event_type and/or source_module
// Query params: event_type, source_module, limit (default 50)
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { event_type, source_module, limit = 50 } = req.query

    let query = supabase
      .from('system_events')
      .select('id, event_type, source_module, target_module, correlation_id, payload, confidence, status, created_at, processed_at')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit, 10) || 50)

    if (event_type)    query = query.eq('event_type', event_type)
    if (source_module) query = query.eq('source_module', source_module)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    res.json({
      totalEvents: data.length,
      events: data.map(e => ({
        id:            e.id,
        eventType:     e.event_type,
        sourceModule:  e.source_module,
        targetModule:  e.target_module,
        correlationId: e.correlation_id,
        payload:       e.payload,
        confidence:    e.confidence,
        status:        e.status,
        createdAt:     e.created_at,
        processedAt:   e.processed_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/events/:correlationId
// Trace all events sharing a correlation ID
// ─────────────────────────────────────────────
router.get('/:correlationId', async (req, res) => {
  try {
    const { correlationId } = req.params

    const { data, error } = await supabase
      .from('system_events')
      .select('*')
      .eq('correlation_id', correlationId)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No events found for this correlation ID' })
    }

    res.json({
      correlationId,
      eventCount: data.length,
      trace: data.map(e => ({
        id:           e.id,
        eventType:    e.event_type,
        sourceModule: e.source_module,
        targetModule: e.target_module,
        payload:      e.payload,
        confidence:   e.confidence,
        status:       e.status,
        createdAt:    e.created_at,
        processedAt:  e.processed_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// POST /api/events/publish
// Manually publish an event (for testing / admin use)
// Body: { eventType, sourceModule, targetModule, payload, confidence }
// ─────────────────────────────────────────────
router.post('/publish', async (req, res) => {
  try {
    const {
      eventType,
      sourceModule  = 'manual',
      targetModule  = 'all',
      payload       = {},
      confidence    = 1.0
    } = req.body

    if (!eventType) {
      return res.status(400).json({ error: 'eventType is required' })
    }

    const result = await eventBus.publish(eventType, sourceModule, targetModule, payload, confidence)

    res.json({
      success:       true,
      correlationId: result.correlationId,
      dbId:          result.dbId,
      eventType,
      sourceModule,
      targetModule
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

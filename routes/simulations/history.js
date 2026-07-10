/**
 * routes/simulations/history.js
 * ─────────────────────────────────────────────
 * GET /api/simulations/history
 * Lists past simulation_runs, filterable by simulation_type and date range.
 */

const express  = require('express')
const router   = express.Router()
const supabase = require('../../supabase')

router.get('/', async (req, res) => {
  try {
    const { type, from, to, limit = 50 } = req.query

    let query = supabase
      .from('simulation_runs')
      .select('id, simulation_type, target_entity, twin_snapshot_id, input_params, affected_entities, impact_score, severity, narrative, run_at')
      .order('run_at', { ascending: false })
      .limit(Math.min(parseInt(limit) || 50, 200))

    if (type)  query = query.eq('simulation_type', type)
    if (from)  query = query.gte('run_at', from)
    if (to)    query = query.lte('run_at', to)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    // Group counts by type
    const countsByType = (data || []).reduce((acc, r) => {
      acc[r.simulation_type] = (acc[r.simulation_type] || 0) + 1
      return acc
    }, {})

    res.json({
      totalRuns: (data || []).length,
      filters: { type: type || null, from: from || null, to: to || null },
      countsByType,
      runs: (data || []).map(r => ({
        id:             r.id,
        simulationType: r.simulation_type,
        targetEntity:   r.target_entity,
        twinSnapshotId: r.twin_snapshot_id,
        inputParams:    r.input_params,
        affectedEntities: r.affected_entities,
        impactScore:    r.impact_score,
        severity:       r.severity,
        narrative:      r.narrative,
        runAt:          r.run_at
      }))
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

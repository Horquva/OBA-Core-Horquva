const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllForecasts() {
  const { data, error } = await supabase
    .from('organizational_forecasts')
    .select('*')
    .order('horizon_days', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

async function fetchFindings(forecastId, type = null) {
  let query = supabase
    .from('forecast_findings')
    .select('finding_type, reference_name, detail')
    .eq('forecast_id', forecastId)

  if (type) query = query.eq('finding_type', type)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

function formatForecast(f) {
  return {
    horizonDays: f.horizon_days,
    healthScore: f.health_score,
    healthTrend: f.health_trend,
    memoryScore: f.memory_score,
    knowledgeLossRisk: f.knowledge_loss_risk,
    continuityScore: f.continuity_score,
    resilienceForecast: f.resilience_forecast,
    outlookScore: f.outlook_score,
    outlookStatus: f.outlook_status,
    computedAt: f.computed_at
  }
}

// ─────────────────────────────────────────────
// GET /api/forecast/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    const forecasts = await fetchAllForecasts()
    if (!forecasts.length) return res.status(404).json({ error: 'No forecast data available' })
    const latest = forecasts[forecasts.length - 1] // 90-day = headline

    res.json({
      forecasts: forecasts.map(formatForecast),
      headlineOutlook: {
        horizonDays: latest.horizon_days,
        outlookScore: latest.outlook_score,
        outlookStatus: latest.outlook_status,
        weakestDimension: ['health', 'memory', 'continuity'].reduce((weakest, dim) => {
          const scoreKey = `${dim}_score`
          if (!weakest || latest[scoreKey] < latest[`${weakest}_score`]) return dim
          return weakest
        }, null)
      },
      // organizational_forecasts is a genuine, never-rewritten time series
      // (D-09 KEEP list) — these figures can never be recomputed live.
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/forecast/health
// ─────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const forecasts = await fetchAllForecasts()

    res.json({
      forecasts: forecasts.map(f => ({
        horizonDays: f.horizon_days,
        healthScore: f.health_score,
        trend: f.health_trend
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/forecast/memory
// ─────────────────────────────────────────────

router.get('/memory', async (req, res) => {
  try {
    const forecasts = await fetchAllForecasts()
    if (!forecasts.length) return res.status(404).json({ error: 'No forecast data available' })
    const headline = forecasts[forecasts.length - 1]

    const criticalCarriers = await fetchFindings(headline.id, 'critical_memory_carrier')
    const undocumented = await fetchFindings(headline.id, 'undocumented')

    res.json({
      forecasts: forecasts.map(f => ({
        horizonDays: f.horizon_days,
        memoryScore: f.memory_score,
        knowledgeLossRisk: f.knowledge_loss_risk
      })),
      criticalMemoryCarriers: criticalCarriers.map(c => ({
        name: c.reference_name,
        detail: c.detail
      })),
      undocumentedAssets: undocumented.map(u => ({
        name: u.reference_name,
        detail: u.detail
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/forecast/continuity
// ─────────────────────────────────────────────

router.get('/continuity', async (req, res) => {
  try {
    const forecasts = await fetchAllForecasts()
    if (!forecasts.length) return res.status(404).json({ error: 'No forecast data available' })
    const headline = forecasts[forecasts.length - 1]

    const fragileWorkflows = await fetchFindings(headline.id, 'fragile_workflow')
    const noBackup = await fetchFindings(headline.id, 'no_backup')

    res.json({
      forecasts: forecasts.map(f => ({
        horizonDays: f.horizon_days,
        continuityScore: f.continuity_score,
        resilienceForecast: f.resilience_forecast
      })),
      fragileWorkflows: fragileWorkflows.map(w => ({
        name: w.reference_name,
        detail: w.detail
      })),
      workflowsWithoutBackup: noBackup.map(w => ({
        name: w.reference_name,
        detail: w.detail
      })),
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/forecast/outlook
// ─────────────────────────────────────────────

router.get('/outlook', async (req, res) => {
  try {
    const forecasts = await fetchAllForecasts()
    if (!forecasts.length) return res.status(404).json({ error: 'No forecast data available' })
    const headline = forecasts[forecasts.length - 1]

    const allFindings = await fetchFindings(headline.id)

    const grouped = {
      criticalMemoryCarriers: allFindings.filter(f => f.finding_type === 'critical_memory_carrier'),
      fragileWorkflows: allFindings.filter(f => f.finding_type === 'fragile_workflow'),
      workflowsWithoutBackup: allFindings.filter(f => f.finding_type === 'no_backup'),
      undocumentedAssets: allFindings.filter(f => f.finding_type === 'undocumented')
    }

    res.json({
      organizationalOutlook: forecasts.map(formatForecast),
      headline: {
        horizonDays: headline.horizon_days,
        outlookScore: headline.outlook_score,
        outlookStatus: headline.outlook_status
      },
      keyFindings: {
        criticalMemoryCarriers: grouped.criticalMemoryCarriers.map(c => ({ name: c.reference_name, detail: c.detail })),
        fragileWorkflows: grouped.fragileWorkflows.map(w => ({ name: w.reference_name, detail: w.detail })),
        workflowsWithoutBackup: grouped.workflowsWithoutBackup.map(w => ({ name: w.reference_name, detail: w.detail })),
        undocumentedAssets: grouped.undocumentedAssets.map(u => ({ name: u.reference_name, detail: u.detail }))
      },
      provenance: { source: 'historical', table: 'organizational_forecasts' }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
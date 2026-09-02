const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const domain = require('../../domain')

router.get('/', async (req, res) => {
  const [{ data, error }, intel] = await Promise.all([
    supabase
      .from('knowledge_assets')
      .select(`
        owner_id,
        is_documented,
        criticality,
        employees ( id, name, role, department )
      `),
    domain.intelligence.all(),
  ])

  if (error) return res.status(500).json({ error: error.message })

  // Criticality-weighted share of org-wide assets (agents+workflows+tools)
  // one person owns -- a genuinely different question from this route's own
  // per-person knowledgeRiskScore below (absolute, not share-based; see the
  // comment on `weights` further down). Was frontend/lib/knowledgeRisk.ts's
  // concentrationScore, computed client-side.
  const concentration = intel.knowledgeConcentration

  // Group assets by employee
  const map = {}
  for (const asset of data) {
    const emp = asset.employees
    if (!emp) continue
    if (!map[emp.id]) {
      map[emp.id] = {
        employee:           emp.name,
        role:               emp.role,
        department:         emp.department,
        totalAssets:        0,
        undocumentedAssets: 0,
        criticalAssets:     0,
        highAssets:         0
      }
    }
    const e = map[emp.id]
    e.totalAssets++
    if (!asset.is_documented)        e.undocumentedAssets++
    if (asset.criticality === 'critical') e.criticalAssets++
    if (asset.criticality === 'high')     e.highAssets++
  }

  // Score each employee. This is NOT a concentration/share metric (nothing
  // here is normalized against other employees or org totals) -- it's an
  // absolute score over what THIS person's own knowledge holdings look like:
  // how much of what they hold is critical, undocumented, or unbacked. A
  // sole owner of one critical, undocumented item scores the same whether
  // the org has 10 knowledge assets or 10,000. The unrelated, genuinely
  // share-based metric is `concentration` above (domain.knowledgeConcentration) --
  // frontend/lib/knowledgeRisk.ts now just reads it off this response rather
  // than computing its own; the two were previously named the same thing
  // here by coincidence, not because they compute the same thing.
  const weights = { critical: 40, high: 20, undocumented: 15 }

  const result = Object.values(map).map(e => {
    const raw =
      (e.criticalAssets     * weights.critical)     +
      (e.highAssets         * weights.high)          +
      (e.undocumentedAssets * weights.undocumented)

    const score = Math.min(Math.round((raw / (e.totalAssets * 55)) * 100), 100)

    const riskLevel =
      score >= 75 ? 'CRITICAL' :
      score >= 50 ? 'HIGH'     :
      score >= 25 ? 'MEDIUM'   : 'LOW'

    return {
      employee:           e.employee,
      role:               e.role,
      department:         e.department,
      totalAssets:        e.totalAssets,
      undocumentedAssets: e.undocumentedAssets,
      criticalAssets:     e.criticalAssets,
      knowledgeRiskScore: score,
      riskLevel
    }
  })

  result.sort((a, b) => b.knowledgeRiskScore - a.knowledgeRiskScore)
  res.json({ total: result.length, employees: result, concentration })
})

module.exports = router
const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select(`
      owner_id,
      is_documented,
      criticality,
      employees ( id, name, role, department )
    `)

  if (error) return res.status(500).json({ error: error.message })

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
        highAssets:         0,
        rawScore:           0
      }
    }
    const e = map[emp.id]
    e.totalAssets++
    if (!asset.is_documented)        e.undocumentedAssets++
    if (asset.criticality === 'critical') e.criticalAssets++
    if (asset.criticality === 'high')     e.highAssets++
  }

  // Score each employee
  const weights = { critical: 40, high: 20, undocumented: 15, singleOwner: 10 }

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
      concentrationScore: score,
      riskLevel
    }
  })

  result.sort((a, b) => b.concentrationScore - a.concentrationScore)
  res.json({ total: result.length, employees: result })
})

module.exports = router
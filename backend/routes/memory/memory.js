const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must, optional } = require('../../lib/supabaseQuery')
const { atOrAbove } = require('../../domain/definitions')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function computeMemoryStatus(asset) {
  const documented = asset.is_documented === true
  const hasCriticality = atOrAbove(asset.criticality, 'high')
  const hasOwner = !!asset.owner_id

  if (!hasOwner) return 'LOST'
  if (!documented && hasCriticality) return 'LOST'
  if (!documented) return 'AT_RISK'
  if (documented && hasCriticality) return 'VULNERABLE'
  return 'PRESERVED'
}

function computeHealthScore(statuses) {
  const points = { PRESERVED: 100, VULNERABLE: 60, AT_RISK: 30, LOST: 0 }
  if (!statuses.length) return 0
  const total = statuses.reduce((sum, s) => sum + (points[s] ?? 0), 0)
  return Math.round(total / statuses.length)
}

function overallStatus(score) {
  if (score >= 80) return 'HEALTHY'
  if (score >= 60) return 'STABLE'
  if (score >= 35) return 'AT RISK'
  return 'CRITICAL'
}

function countByStatus(assets) {
  return assets.reduce((acc, a) => {
    acc[a.memoryStatus] = (acc[a.memoryStatus] || 0) + 1
    return acc
  }, { PRESERVED: 0, VULNERABLE: 0, AT_RISK: 0, LOST: 0 })
}

async function fetchAllAssets() {
  const { data, error } = await supabase
    .from('knowledge_assets')
    .select(`
      id,
      asset_type,
      asset_id,
      is_documented,
      criticality,
      owner_id,
      employees (
        id,
        name,
        role,
        department
      )
    `)

  if (error) throw new Error(error.message)

  return data.map(a => ({
    ...a,
    memoryStatus: computeMemoryStatus(a)
  }))
}

const ASSET_TYPE_TABLE = {
  agent:    'agents',
  workflow: 'workflows',
  platform: 'ai_platforms'
}

/**
 * Resolves every asset's name in at most three batched queries (one per
 * table actually referenced) instead of one query per asset — /map iterates
 * every knowledge asset in the org, so a per-item lookup scaled with total
 * asset count on every call.
 */
async function resolveAssetNames(assets) {
  const idsByTable = {}
  for (const a of assets) {
    const table = ASSET_TYPE_TABLE[a.asset_type]
    if (!table) continue
    ;(idsByTable[table] = idsByTable[table] || new Set()).add(a.asset_id)
  }

  const names = new Map() // `${assetType}:${assetId}` -> name
  await Promise.all(
    Object.entries(idsByTable).map(async ([table, idSet]) => {
      // A name lookup that fails is not worth failing the whole request over,
      // but 'Unknown' must not be the silent answer to a broken query — that
      // reads as a real, unnamed asset. optional() logs the actual error.
      const rows = await optional(`${table} (batch name lookup)`, supabase
        .from(table)
        .select('id, name')
        .in('id', [...idSet]), [])
      const assetType = Object.keys(ASSET_TYPE_TABLE).find((t) => ASSET_TYPE_TABLE[t] === table)
      for (const row of rows) names.set(`${assetType}:${row.id}`, row.name)
    })
  )

  return (assetType, assetId) => names.get(`${assetType}:${assetId}`) ?? 'Unknown'
}

// ─────────────────────────────────────────────
// GET /api/memory/health
// ─────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const assets = await fetchAllAssets()
    const statuses = assets.map(a => a.memoryStatus)
    const score = computeHealthScore(statuses)
    const breakdown = countByStatus(assets)

    res.json({
      institutionalMemoryHealthScore: score,
      overallStatus: overallStatus(score),
      totalAssets: assets.length,
      breakdown
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/memory/employee/:name
// ─────────────────────────────────────────────

router.get('/employee/:name', async (req, res) => {
  try {
    const { name } = req.params

    // Get employee
    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, name, role, department, risk')
      .ilike('name', name)
      .single()

    if (empError || !emp) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    // Get all knowledge assets owned by this employee
    const { data: rawAssets, error: assetError } = await supabase
      .from('knowledge_assets')
      .select('id, asset_type, asset_id, is_documented, criticality, owner_id')
      .eq('owner_id', emp.id)

    if (assetError) throw new Error(assetError.message)

    // Resolve asset names and compute status
    const nameFor = await resolveAssetNames(rawAssets)
    const assets = rawAssets.map(a => ({
      ...a,
      assetName: nameFor(a.asset_type, a.asset_id),
      memoryStatus: computeMemoryStatus(a)
    }))

    // Workflow runbooks owned by employee. This feeds both the department list
    // and the carrier-risk verdict, so a failed read must not pass as "owns no
    // runbooks" — that understates the person's risk.
    const runbooks = await must('workflow_runbooks', supabase
      .from('workflow_runbooks')
      .select('workflow_id, is_documented, last_updated, workflows(name, department)')
      .eq('owner_id', emp.id))

    // Departments impacted
    const departments = [
      ...new Set([
        emp.department,
        ...runbooks.map(r => r.workflows?.department).filter(Boolean)
      ])
    ]

    const breakdown = countByStatus(assets)
    const score = computeHealthScore(assets.map(a => a.memoryStatus))

    // Carrier risk
    const lostOrAtRisk = (breakdown.LOST ?? 0) + (breakdown.AT_RISK ?? 0)
    const carrierRisk =
      lostOrAtRisk >= 4 ? 'CRITICAL'
      : lostOrAtRisk >= 2 ? 'HIGH'
      : lostOrAtRisk >= 1 ? 'MEDIUM'
      : 'LOW'

    res.json({
      employee: emp,
      memoryCarrierRisk: carrierRisk,
      memoryHealthScore: score,
      totalAssetsOwned: assets.length,
      breakdown,
      assets: assets.map(a => ({
        assetName:    a.assetName,
        assetType:    a.asset_type,
        isDocumented: a.is_documented,
        criticality:  a.criticality,
        memoryStatus: a.memoryStatus
      })),
      workflowRunbooks: runbooks.map(r => ({
        workflowName:  r.workflows?.name,
        department:    r.workflows?.department,
        isDocumented:  r.is_documented,
        lastUpdated:   r.last_updated
      })),
      impactIfLeaves: {
        departmentsImpacted: departments,
        assetsAtRisk: assets.filter(a =>
          a.memoryStatus === 'AT_RISK' || a.memoryStatus === 'LOST'
        ).map(a => ({
          assetName:    a.assetName,
          assetType:    a.asset_type,
          memoryStatus: a.memoryStatus
        }))
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/memory/map
// ─────────────────────────────────────────────

router.get('/map', async (req, res) => {
  try {
    const assets = await fetchAllAssets()

    // Resolve all asset names via batched lookups, not one query per asset
    const nameFor = await resolveAssetNames(assets)
    const map = assets.map(a => ({
      assetName: nameFor(a.asset_type, a.asset_id),
      assetType:    a.asset_type,
      criticality:  a.criticality,
      isDocumented: a.is_documented,
      memoryStatus: a.memoryStatus,
      owner: a.employees
        ? { name: a.employees.name, role: a.employees.role, department: a.employees.department }
        : null
    }))

    // Group by status for quick overview
    const grouped = {
      PRESERVED:  map.filter(a => a.memoryStatus === 'PRESERVED'),
      VULNERABLE: map.filter(a => a.memoryStatus === 'VULNERABLE'),
      AT_RISK:    map.filter(a => a.memoryStatus === 'AT_RISK'),
      LOST:       map.filter(a => a.memoryStatus === 'LOST')
    }

    const score = computeHealthScore(map.map(a => a.memoryStatus))

    res.json({
      institutionalMemoryHealthScore: score,
      overallStatus: overallStatus(score),
      totalAssets: map.length,
      organizationMemoryMap: map,
      groupedByStatus: grouped
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
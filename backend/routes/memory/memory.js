const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { must } = require('../../lib/supabaseQuery')
const domain = require('../../domain')

/**
 * All three routes below used to run their own `computeMemoryStatus()`/IMHS
 * -- a formula that ignored backup_owner entirely and nothing actually
 * consumed for data (only a health pinger touched `/health`; `/map` and
 * `/employee/:name` had zero real callers). D-60 picked
 * domain.intelligence.compute.orgMemory() (backup_owner + documentation
 * based, ported from the live frontend formula) as canonical -- see that
 * function's header comment in domain/derived.js for the full decision.
 * Every route here now reads that one computation instead of re-deriving it.
 */

// ─────────────────────────────────────────────
// GET /api/memory/health
// ─────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const intel = await domain.intelligence.all()
    const report = intel.orgMemory

    res.json({
      institutionalMemoryHealthScore: report.imhs,
      overallStatus: report.imhsVerdict,
      totalAssets: report.totalAssets,
      breakdown: {
        PRESERVED: report.preserved.length,
        VULNERABLE: report.vulnerable.length,
        AT_RISK: report.atRisk.length,
        LOST: report.lost.length,
      },
      evidence: report.evidence,
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

    const { data: emp, error: empError } = await supabase
      .from('employees')
      .select('id, name, role, department, risk')
      .ilike('name', name)
      .single()

    if (empError || !emp) {
      return res.status(404).json({ error: 'Employee not found' })
    }

    const intel = await domain.intelligence.all()
    const report = intel.orgMemory
    const carrier = report.carriers.find((c) => c.employeeId === emp.id) || {
      totalOwned: 0, preservedCount: 0, vulnerableCount: 0, atRiskCount: 0, lostCount: 0,
      undocumentedCount: 0, noBackupCount: 0, assets: [], tier: 'LOW', healthScore: null, isCriticalCarrier: false,
    }

    // Workflow runbooks owned by employee. This feeds both the department list
    // and impactIfLeaves, so a failed read must not pass as "owns no
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

    res.json({
      employee: emp,
      memoryCarrierRisk: carrier.tier,
      memoryHealthScore: carrier.healthScore,
      totalAssetsOwned: carrier.totalOwned,
      breakdown: {
        PRESERVED: carrier.preservedCount,
        VULNERABLE: carrier.vulnerableCount,
        AT_RISK: carrier.atRiskCount,
        LOST: carrier.lostCount,
      },
      assets: carrier.assets.map(a => ({
        assetName:    a.name,
        assetType:    a.type,
        isDocumented: a.documented,
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
        assetsAtRisk: carrier.assets.filter(a =>
          a.memoryStatus === 'AT_RISK' || a.memoryStatus === 'LOST'
        ).map(a => ({
          assetName:    a.name,
          assetType:    a.type,
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
    const intel = await domain.intelligence.all()
    const report = intel.orgMemory

    // The full canonical report, not a second reshaping of it -- a prior
    // version of this route remapped each asset into an `assetName`/`isDocumented`
    // shape that dropped `id`/`backup_owner`/`documented`, fields the frontend's
    // carrier and lost-assets panels need. Nothing outside this route consumed
    // that old shape (confirmed before D-60), so there is no compatibility
    // reason to keep it.
    res.json({
      assets: report.assets,
      preserved: report.preserved,
      atRisk: report.atRisk,
      vulnerable: report.vulnerable,
      lost: report.lost,
      carriers: report.carriers,
      criticalCarriers: report.criticalCarriers,
      highCarriers: report.highCarriers,
      imhs: report.imhs,
      imhsVerdict: report.imhsVerdict,
      evidence: report.evidence,
      totalAssets: report.totalAssets,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

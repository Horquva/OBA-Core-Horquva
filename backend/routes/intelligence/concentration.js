/**
 * CONCENTRATION FINDINGS ENDPOINT (FE-5 Part 2)
 * ----------------------------------------------
 * Surfaces specific, named concentration findings (e.g.
 * "Ahmed silently owns 8 workflows and 3 AI agents, with no backup for any of them")
 * rather than a generic numerical score.
 *
 * Routes:
 *   GET /api/intelligence/concentration/findings
 *   GET /api/intelligence/concentration
 */

const express = require('express')
const router = express.Router()
const domain = require('../../domain')

/**
 * Generates a human-readable named finding string.
 * e.g. "Ahmed silently owns 8 workflows (A, B, ...) and 3 AI agents (X, Y, ...), with no backup for any of them."
 */
function buildFindingText(ownerName, workflows, agents, hasBackup, backupOwner) {
  const wCount = workflows.length
  const aCount = agents.length

  const wNames = workflows.map((w) => (typeof w === 'string' ? w : w.name)).filter(Boolean)
  const aNames = agents.map((a) => (typeof a === 'string' ? a : a.name)).filter(Boolean)

  const wText = `${wCount} workflow${wCount === 1 ? '' : 's'}${wNames.length ? ` (${wNames.join(', ')})` : ''}`
  const aText = `${aCount} AI agent${aCount === 1 ? '' : 's'}${aNames.length ? ` (${aNames.join(', ')})` : ''}`

  let assetClause = ''
  if (wCount > 0 && aCount > 0) {
    assetClause = `${wText} and ${aText}`
  } else if (wCount > 0) {
    assetClause = wText
  } else if (aCount > 0) {
    assetClause = aText
  } else {
    assetClause = 'no active workflows or agents'
  }

  if (!hasBackup) {
    return `${ownerName} silently owns ${assetClause}, with no backup for any of them.`
  }

  return `${ownerName} owns ${assetClause}, with designated backup to ${backupOwner || 'alternate owner'}.`
}

/**
 * Computes concentration findings across all owners.
 * Supports both KnowledgeGraph instance and raw object collections for testing.
 */
function computeConcentrationFindings(g) {
  if (!g) return { totalFindings: 0, unbackedOwnersCount: 0, findings: [] }

  const humans = g.entities.list().filter((e) => e.type === 'employee' || e.type === 'executive')
  const findings = []

  for (const human of humans) {
    const ownedRels = g.relationships.from(human.id).filter((r) => r.type === 'owns')
    if (!ownedRels.length) continue

    const ownedEntities = ownedRels.map((r) => g.entities.get(r.to)).filter(Boolean)

    const workflows = ownedEntities.filter((e) => e.type === 'workflow')
    const agents = ownedEntities.filter((e) => e.type === 'ai_agent' && e.metadata?.kind === 'automation-agent')
    const tools = ownedEntities.filter((e) => e.type === 'ai_agent' && e.metadata?.kind === 'ai-platform')

    const totalKeyAssets = workflows.length + agents.length
    if (totalKeyAssets === 0) continue

    const meta = human.metadata || {}
    const hasBackup = Boolean(meta.backup_owner || meta.backupOwner)
    const backupOwner = meta.backup_owner || meta.backupOwner || null

    // Determine finding severity
    let severity = 'LOW'
    if (!hasBackup) {
      if (totalKeyAssets >= 3 || workflows.some((w) => w.metadata?.criticality === 'critical') || agents.some((a) => a.metadata?.risk === 'critical')) {
        severity = 'CRITICAL'
      } else {
        severity = 'HIGH'
      }
    } else {
      if (totalKeyAssets >= 4) {
        severity = 'MEDIUM'
      } else {
        severity = 'LOW'
      }
    }

    const findingText = buildFindingText(human.name, workflows, agents, hasBackup, backupOwner)

    findings.push({
      ownerId: meta.sourceId || human.id,
      ownerName: human.name,
      role: meta.role || null,
      department: meta.department || null,
      workflowCount: workflows.length,
      agentCount: agents.length,
      toolCount: tools.length,
      workflows: workflows.map((w) => w.name),
      agents: agents.map((a) => a.name),
      tools: tools.map((t) => t.name),
      hasBackup,
      backupOwner,
      severity,
      finding: findingText,
    })
  }

  // Sort: unbacked first, then by highest total concentration (workflows + agents)
  findings.sort((a, b) => {
    if (!a.hasBackup && b.hasBackup) return -1
    if (a.hasBackup && !b.hasBackup) return 1
    const totalA = a.workflowCount + a.agentCount
    const totalB = b.workflowCount + b.agentCount
    return totalB - totalA
  })

  return {
    totalFindings: findings.length,
    unbackedOwnersCount: findings.filter((f) => !f.hasBackup).length,
    findings,
  }
}

// ── GET /api/intelligence/concentration/findings ──
router.get(['/concentration/findings', '/concentration-findings', '/concentration'], (req, res) => {
  if (!domain.graph.isReady()) {
    return res.status(503).json({ error: 'Knowledge graph not loaded' })
  }

  const g = domain.graph.get()
  const result = computeConcentrationFindings(g)
  res.json(result)
})

// ── GET /api/intelligence/concentration/findings/:ownerId ──
router.get('/concentration/findings/:ownerId', (req, res) => {
  if (!domain.graph.isReady()) {
    return res.status(503).json({ error: 'Knowledge graph not loaded' })
  }

  const g = domain.graph.get()
  const { findings } = computeConcentrationFindings(g)
  const target = String(req.params.ownerId).trim().toLowerCase()

  const match = findings.find(
    (f) => String(f.ownerId).toLowerCase() === target || f.ownerName.toLowerCase() === target
  )

  if (!match) {
    return res.status(404).json({ error: `No concentration findings for owner "${req.params.ownerId}"` })
  }

  res.json(match)
})

module.exports = router
module.exports.buildFindingText = buildFindingText
module.exports.computeConcentrationFindings = computeConcentrationFindings

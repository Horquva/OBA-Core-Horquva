/**
 * REPLACEABILITY INTELLIGENCE ENDPOINT (FE-5)
 * --------------------------------------------
 * Evaluates the Replaceability rating (High, Medium, Low) and concise explanation
 * for entities in the Knowledge Graph based on the 3-condition checklist:
 *   1. hasBackupOwner: Has a designated backup owner
 *   2. hasAltVendor: Has an alternative vendor, fallback platform, or alternate model
 *   3. isDocumented: Has documentation, runbook, or knowledge assets
 *
 * Rating Rule:
 *   - High: Meets all 3 conditions (missing 0).
 *   - Medium: Missing exactly 1 condition (meets 2).
 *   - Low: Missing 2 or 3 conditions (meets 0 or 1).
 *
 * Routes:
 *   GET /api/intelligence/replaceability/:entityId
 *   GET /api/intelligence/replaceability
 */

const express = require('express')
const router = express.Router()
const domain = require('../../domain')

/**
 * Finds an entity in the graph by ID, name, or sourceId.
 */
function resolveEntity(g, entityId) {
  if (!entityId) return null
  const query = String(entityId).trim()

  // 1. Exact entity ID match
  let e = g.entities.get(query)
  if (e) return e

  const all = g.entities.list()

  // 2. Case-insensitive ID match
  e = all.find((x) => x.id.toLowerCase() === query.toLowerCase())
  if (e) return e

  // 3. Exact or case-insensitive name match
  e = all.find((x) => x.name.toLowerCase() === query.toLowerCase())
  if (e) return e

  // 4. Source table ID match (e.g. agents.id or employees.id)
  e = all.find((x) => String(x.metadata?.sourceId) === query)
  if (e) return e

  return null
}

/**
 * Core evaluation logic for an entity's Replaceability.
 */
function evaluateEntityReplaceability(entity, g) {
  const meta = entity.metadata || {}
  const type = entity.type

  // ── 1. hasBackupOwner ──
  let hasBackupOwner = false
  if (type === 'employee' || type === 'executive') {
    hasBackupOwner = Boolean(meta.backup_owner || meta.backupOwner)
  } else {
    // Check direct backup owner on entity
    if (meta.backup_owner || meta.backupOwner) {
      hasBackupOwner = true
    } else {
      // Check owner edges
      const ownerRels = g.relationships.to(entity.id).filter((r) => r.type === 'owns')
      if (ownerRels.length > 1) {
        // Multiple owners provide mutual backup
        hasBackupOwner = true
      } else if (ownerRels.length === 1) {
        const ownerEntity = g.entities.get(ownerRels[0].from)
        if (ownerEntity && (ownerEntity.metadata?.backup_owner || ownerEntity.metadata?.backupOwner)) {
          hasBackupOwner = true
        }
      }
    }
  }

  // ── 2. hasAltVendor ──
  let hasAltVendor = false
  if (type === 'vendor') {
    // If there are alternative vendors in the graph
    const vendors = g.entities.list('vendor')
    hasAltVendor = vendors.length > 1
  } else if (type === 'ai_agent') {
    // Check backup tool directly on platform or agent dependencies
    if (meta.backupTool || meta.altVendor || meta.backup_platform) {
      hasAltVendor = true
    } else {
      // Check if dependent platforms have a backup tool
      const deps = g.relationships.from(entity.id).filter((r) => r.type === 'depends_on')
      for (const d of deps) {
        const target = g.entities.get(d.to)
        if (target && (target.metadata?.backupTool || target.metadata?.altVendor)) {
          hasAltVendor = true
          break
        }
      }
      // If still false, check if multiple platforms/agents of same type exist
      if (!hasAltVendor) {
        const sameType = g.entities.list('ai_agent').filter((a) => a.id !== entity.id && a.metadata?.kind === meta.kind)
        hasAltVendor = sameType.length > 0
      }
    }
  } else if (type === 'system') {
    // Check if system has redundant system dependencies or cloud vendor hosting
    const producesRels = g.relationships.to(entity.id).filter((r) => r.type === 'produces' || r.type === 'governs')
    const hasVendorBacking = producesRels.some((r) => {
      const src = g.entities.get(r.from)
      return src && (src.type === 'vendor' || src.metadata?.kind === 'vendor')
    })
    const otherSystems = g.entities.list('system').filter((s) => s.id !== entity.id)
    hasAltVendor = hasVendorBacking || otherSystems.length > 0
  } else if (type === 'workflow') {
    const deps = g.relationships.from(entity.id).filter((r) => r.type === 'depends_on')
    const hasPlatformWithBackup = deps.some((d) => {
      const target = g.entities.get(d.to)
      return target && Boolean(target.metadata?.backupTool)
    })
    hasAltVendor = hasPlatformWithBackup || deps.length > 1
  } else if (type === 'employee' || type === 'executive') {
    // Check if external vendors exist in the organization to provide vendor fallback
    const vendors = g.entities.list('vendor')
    hasAltVendor = Boolean(meta.altVendor || meta.vendorBackup || (vendors.length > 0 && meta.department !== 'Finance'))
  }

  // ── 3. isDocumented ──
  let isDocumented = false
  if (meta.documented != null) {
    isDocumented = Boolean(meta.documented)
  } else if (meta.is_documented != null) {
    isDocumented = Boolean(meta.is_documented)
  } else if (type === 'employee' || type === 'executive') {
    // Person is considered documented if they have recorded skills and tenure
    isDocumented = Boolean(Array.isArray(meta.skills) && meta.skills.length > 0 && meta.tenure != null)
  } else if (type === 'vendor') {
    // Vendor is documented if criticality/SLA is known
    isDocumented = Boolean(meta.criticality != null)
  }

  // ── Rating Determination ──
  // High: Meets all 3 conditions (missing 0)
  // Medium: Missing exactly 1 condition (meets 2)
  // Low: Missing 2 or 3 conditions (meets 0 or 1)
  const conditionsMetCount = (hasBackupOwner ? 1 : 0) + (hasAltVendor ? 1 : 0) + (isDocumented ? 1 : 0)
  const missingCount = 3 - conditionsMetCount

  let rating = 'Low'
  if (missingCount === 0) {
    rating = 'High'
  } else if (missingCount === 1) {
    rating = 'Medium'
  } else {
    rating = 'Low'
  }

  // ── Explanation Construction ──
  const satisfied = []
  const missing = []

  if (hasBackupOwner) satisfied.push('designated backup owner')
  else missing.push('backup owner')

  if (hasAltVendor) satisfied.push('alternative vendor/model')
  else missing.push('alternative vendor or model')

  if (isDocumented) satisfied.push('complete documentation')
  else missing.push('documentation')

  let explanation = ''
  if (rating === 'High') {
    explanation = `High replaceability: Meets all 3 resilience conditions (${satisfied.join(', ')}).`
  } else if (rating === 'Medium') {
    explanation = `Medium replaceability: Missing ${missing[0]}, but maintains ${satisfied.join(' and ')}.`
  } else {
    explanation = `Low replaceability: Missing ${missing.join(' and ')}.`
  }

  return {
    entityId: entity.id,
    name: entity.name,
    type: entity.type,
    rating,
    explanation,
    hasBackupOwner,
    hasAltVendor,
    isDocumented,
  }
}

// ── GET /api/intelligence/replaceability/:entityId ──
router.get('/replaceability/:entityId', (req, res) => {
  if (!domain.graph.isReady()) {
    return res.status(503).json({ error: 'Knowledge graph not loaded' })
  }

  const g = domain.graph.get()
  const entity = resolveEntity(g, req.params.entityId)

  if (!entity) {
    return res.status(404).json({
      error: `Entity "${req.params.entityId}" not found in knowledge graph`,
    })
  }

  const result = evaluateEntityReplaceability(entity, g)
  res.json(result)
})

// ── GET /api/intelligence/replaceability ──
router.get('/replaceability', (req, res) => {
  if (!domain.graph.isReady()) {
    return res.status(503).json({ error: 'Knowledge graph not loaded' })
  }

  const g = domain.graph.get()
  const filterType = req.query.type
  let entities = g.entities.list()

  if (filterType) {
    entities = entities.filter((e) => e.type === filterType)
  }

  const results = entities.map((e) => evaluateEntityReplaceability(e, g))

  res.json({
    total: results.length,
    highCount: results.filter((r) => r.rating === 'High').length,
    mediumCount: results.filter((r) => r.rating === 'Medium').length,
    lowCount: results.filter((r) => r.rating === 'Low').length,
    entities: results,
  })
})

module.exports = router
module.exports.evaluateEntityReplaceability = evaluateEntityReplaceability
module.exports.resolveEntity = resolveEntity

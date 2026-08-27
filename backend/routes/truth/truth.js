const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')
const { evidenceGate } = require('../../domain/definitions')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchClaimsWithEntity(filters = {}) {
  let query = supabase
    .from('truth_claims')
    .select(`
      id,
      claim_text,
      claim_category,
      evidence,
      verdict,
      confidence_score,
      data_source,
      is_contradicted,
      created_at,
      truth_entities (
        entity_name,
        entity_type,
        department
      )
    `)

  if (filters.verdict)      query = query.eq('verdict', filters.verdict)
  if (filters.entity_id)    query = query.eq('entity_id', filters.entity_id)
  if (filters.is_contradicted !== undefined) {
    query = query.eq('is_contradicted', filters.is_contradicted)
  }

  const { data, error } = await query.order('confidence_score', { ascending: false })
  if (error) throw new Error(error.message)
  return data
}

function formatClaim(c) {
  return {
    entityName:      c.truth_entities?.entity_name,
    entityType:      c.truth_entities?.entity_type,
    department:      c.truth_entities?.department,
    claimText:       c.claim_text,
    claimCategory:   c.claim_category,
    evidence:        c.evidence,
    verdict:         c.verdict,
    confidenceScore: c.confidence_score,
    dataSource:      c.data_source,
    isContradicted:  c.is_contradicted,
    createdAt:       c.created_at
  }
}

function computeLiveTrustScore(claims) {
  if (!claims.length) return 0
  const verified = claims.filter(c => c.verdict === 'VERIFIED').length
  return Math.round((verified / claims.length) * 100 * 100) / 100
}

/**
 * Decides whether there's enough evidence to publish a trust verdict at all,
 * and computes it if so. Zero claims used to read as trustScore: 0 and
 * trustStatus: 'UNTRUSTED' via the ternary below — the same absence-reads-
 * as-a-verdict bug band() has elsewhere in the product, just under its own
 * inline thresholds instead of band() itself (D-07, D-10).
 */
function trustStatusFor(claims) {
  const evidence = evidenceGate(claims, () => true)
  if (!evidence.sufficient) return { trustStatus: null, evidence }

  const trustScore = computeLiveTrustScore(claims)
  const trustStatus =
    trustScore >= 75 ? 'TRUSTED'
    : trustScore >= 50 ? 'PARTIAL'
    : 'UNTRUSTED'
  return { trustStatus, evidence }
}

// ─────────────────────────────────────────────
// GET /api/intelligence/truth
// Full truth report — all claims + entities
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const claims = await fetchClaimsWithEntity()

    const verdictBreakdown = claims.reduce((acc, c) => {
      acc[c.verdict] = (acc[c.verdict] || 0) + 1
      return acc
    }, { VERIFIED: 0, UNVERIFIED: 0, CONTRADICTED: 0 })

    const trustScore = computeLiveTrustScore(claims)

    // Group by entity for entity-level overview
    const byEntity = {}
    claims.forEach(c => {
      const name = c.truth_entities?.entity_name ?? 'Unknown'
      if (!byEntity[name]) {
        byEntity[name] = {
          entityName: name,
          entityType: c.truth_entities?.entity_type,
          department: c.truth_entities?.department,
          claims: []
        }
      }
      byEntity[name].claims.push(formatClaim(c))
    })

    res.json({
      totalClaims: claims.length,
      verdictBreakdown,
      trustScore,
      entitiesChecked: Object.keys(byEntity).length,
      report: Object.values(byEntity)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/truth/summary
// ─────────────────────────────────────────────

router.get('/summary', async (req, res) => {
  try {
    // Live computation from truth_claims
    const claims = await fetchClaimsWithEntity()

    const total        = claims.length
    const verified     = claims.filter(c => c.verdict === 'VERIFIED').length
    const unverified   = claims.filter(c => c.verdict === 'UNVERIFIED').length
    const contradicted = claims.filter(c => c.verdict === 'CONTRADICTED').length
    const trustScore   = computeLiveTrustScore(claims)
    const { trustStatus, evidence } = trustStatusFor(claims)

    // Entities with contradictory evidence
    const contradictedEntities = [
      ...new Set(
        claims
          .filter(c => c.is_contradicted)
          .map(c => c.truth_entities?.entity_name)
          .filter(Boolean)
      )
    ]

    // Categories with most failures
    const categoryFailures = {}
    claims
      .filter(c => c.verdict !== 'VERIFIED')
      .forEach(c => {
        categoryFailures[c.claim_category] =
          (categoryFailures[c.claim_category] || 0) + 1
      })

    const weakestCategory = Object.entries(categoryFailures)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    res.json({
      totalClaims:              total,
      verifiedClaims:           verified,
      unverifiedClaims:         unverified,
      contradictedClaims:       contradicted,
      trustScore,
      trustStatus,
      evidence,
      entitiesWithContradictions: contradictedEntities.length,
      contradictedEntities,
      weakestClaimCategory: weakestCategory
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/truth/verified
// ─────────────────────────────────────────────

router.get('/verified', async (req, res) => {
  try {
    const claims = await fetchClaimsWithEntity({ verdict: 'VERIFIED' })

    res.json({
      totalVerified: claims.length,
      claims: claims.map(formatClaim)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/truth/unverified
// Returns UNVERIFIED + CONTRADICTED
// ─────────────────────────────────────────────

router.get('/unverified', async (req, res) => {
  try {
    const [unverified, contradicted] = await Promise.all([
      fetchClaimsWithEntity({ verdict: 'UNVERIFIED' }),
      fetchClaimsWithEntity({ verdict: 'CONTRADICTED' })
    ])

    const all = [...contradicted, ...unverified]
      .sort((a, b) => a.confidence_score - b.confidence_score)

    res.json({
      totalUnverified:   unverified.length,
      totalContradicted: contradicted.length,
      combinedTotal:     all.length,
      claims:            all.map(formatClaim)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/intelligence/truth/entity/:name
// ─────────────────────────────────────────────

router.get('/entity/:name', async (req, res) => {
  try {
    const { name } = req.params

    // Resolve entity
    const { data: entity, error: entityError } = await supabase
      .from('truth_entities')
      .select('id, entity_name, entity_type, department')
      .ilike('entity_name', name)
      .single()

    if (entityError || !entity) {
      return res.status(404).json({ error: `Entity "${name}" not found in truth registry.` })
    }

    const claims = await fetchClaimsWithEntity({ entity_id: entity.id })

    const verdictBreakdown = claims.reduce((acc, c) => {
      acc[c.verdict] = (acc[c.verdict] || 0) + 1
      return acc
    }, { VERIFIED: 0, UNVERIFIED: 0, CONTRADICTED: 0 })

    const entityTrustScore = computeLiveTrustScore(claims)

    const hasContradictions = claims.some(c => c.is_contradicted)

    res.json({
      entityName:        entity.entity_name,
      entityType:        entity.entity_type,
      department:        entity.department,
      totalClaims:       claims.length,
      verdictBreakdown,
      entityTrustScore,
      hasContradictions,
      claims:            claims.map(formatClaim)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
router.trustStatusFor = trustStatusFor
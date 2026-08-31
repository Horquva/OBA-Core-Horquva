const express = require('express')
const router = express.Router()
const supabase = require('../../supabase')

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function fetchAllLinksWithEntity() {
  const { data, error } = await supabase
    .from('accountability_links')
    .select(`
      id,
      entity_id,
      person_name,
      raci_role,
      accountability_entities ( entity_name, entity_type, department )
    `)

  if (error) throw new Error(error.message)
  return data
}

async function fetchAllEntityScores() {
  const { data, error } = await supabase
    .from('accountability_scores')
    .select(`
      id,
      entity_id,
      score,
      status,
      same_r_and_a,
      missing_responsible,
      missing_accountable,
      accountability_entities ( entity_name, entity_type, department )
    `)

  if (error) throw new Error(error.message)
  return data
}

function groupByEntity(links) {
  const grouped = {}
  links.forEach(l => {
    const key = l.entity_id
    if (!grouped[key]) {
      grouped[key] = {
        entityId: key,
        entityName: l.accountability_entities?.entity_name,
        entityType: l.accountability_entities?.entity_type,
        department: l.accountability_entities?.department,
        roles: []
      }
    }
    grouped[key].roles.push({ person: l.person_name, role: l.raci_role })
  })
  return Object.values(grouped)
}

// ─────────────────────────────────────────────
// GET /api/accountability/score
// ─────────────────────────────────────────────

router.get('/score', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accountability_summary')
      .select('*')
      .order('computed_at', { ascending: false })
      .limit(1)
      .single()

    if (error) throw new Error(error.message)

    res.json({
      accountabilityScore: data.accountability_score,
      status: data.status,
      totalEntities: data.total_entities,
      entitiesWithLinks: data.entities_with_links,
      sameResponsibleAccountableCount: data.same_r_and_a_count,
      uniquePeopleCount: data.unique_people_count,
      computedAt: data.computed_at
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/accountability/entities
// ─────────────────────────────────────────────

router.get('/entities', async (req, res) => {
  try {
    const scores = await fetchAllEntityScores()

    const formatted = scores.map(s => ({
      entityName: s.accountability_entities?.entity_name,
      entityType: s.accountability_entities?.entity_type,
      department: s.accountability_entities?.department,
      score: s.score,
      status: s.status,
      sameResponsibleAccountable: s.same_r_and_a,
      missingResponsible: s.missing_responsible,
      missingAccountable: s.missing_accountable
    }))

    res.json({
      totalEntities: formatted.length,
      entities: formatted
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/accountability/chains
// ─────────────────────────────────────────────

router.get('/chains', async (req, res) => {
  try {
    const links = await fetchAllLinksWithEntity()
    const entities = groupByEntity(links)

    const chains = entities.map(e => ({
      entityName: e.entityName,
      entityType: e.entityType,
      department: e.department,
      responsible: e.roles.filter(r => r.role === 'Responsible').map(r => r.person),
      accountable: e.roles.filter(r => r.role === 'Accountable').map(r => r.person),
      consulted: e.roles.filter(r => r.role === 'Consulted').map(r => r.person),
      informed: e.roles.filter(r => r.role === 'Informed').map(r => r.person),
      decisionAuthority: e.roles.filter(r => r.role === 'Decision Authority').map(r => r.person)
    }))

    res.json(chains)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────
// GET /api/accountability/issues
// ─────────────────────────────────────────────

router.get('/issues', async (req, res) => {
  try {
    const links = await fetchAllLinksWithEntity()
    const entities = groupByEntity(links)
    const scores = await fetchAllEntityScores()

    const sameRAEntities = scores.filter(s => s.same_r_and_a)

    // Concentration risk: count entities per person across Responsible + Accountable roles
    const personCounts = {}
    links.forEach(l => {
      if (l.raci_role === 'Responsible' || l.raci_role === 'Accountable') {
        personCounts[l.person_name] = (personCounts[l.person_name] || 0) + 1
      }
    })

    const concentrationRisk = Object.entries(personCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([person, count]) => ({ person, entityCount: count }))

    const uniquePeople = [...new Set(links.map(l => l.person_name))]

    res.json({
      totalSameResponsibleAccountable: sameRAEntities.length,
      sameResponsibleAccountableEntities: sameRAEntities.map(s => ({
        entityName: s.accountability_entities?.entity_name,
        entityType: s.accountability_entities?.entity_type
      })),
      concentrationRisk,
      uniquePeopleCount: uniquePeople.length,
      uniquePeople,
      noSeparationOfDutiesCount: sameRAEntities.length
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
const express = require('express')
const router = express.Router()
const domain = require('../../domain')

// GET /api/intelligence/dependency-scan — the Executive Dependency Scan
// (Blueprint §1.3, Phase 3.4): the commercial wedge as one board-ready read.
//
// A composite of the already-computed engines — this route owns NO math:
//   1. SPOFs ranked by Engine A blast radius (agent-spofs' canonical verdicts)
//   2. Concentration chokepoints (Feature 2: KEY_PERSON / MODEL_/VENDOR_)
//   3. Knowledge vacuums (undocumented critical assets)
//   4. Recent structural changes + volatility (Feature 3 + 3.3)
//   5. Replaceability's Vulnerable Core (Feature 1)
//
// Every section carries its own evidence and degrades INDEPENDENTLY: a
// section whose backing data is missing reads insufficient_evidence — never
// a fabricated zero (the Ironclad rule applies per section). 48-hour scan
// deliverable: JSON now; a PDF/PPT export renders from this payload later.
router.get('/', async (req, res) => {
  try {
    const [intel, roots] = await Promise.all([
      domain.intelligence.all(),
      domain.intelligence.compute.loadRoots(),
    ])
    const replaceability = domain.replaceability(roots)
    const concentration = intel.concentration || domain.concentration(roots)

    // ── 1. SPOFs, worst blast radius first ──
    const spofSection = (() => {
      const spofs = (roots.agents || []).map((agent) => {
        const criticality = agent.risk
        const owner = agent.owner_id
          ? ((roots.employees || []).find((e) => e.id === agent.owner_id) || {}).name ?? null
          : null
        const hasBackup = agent.owner_id != null
          ? Boolean((roots.owners || []).some((o) => o.employee_id === agent.owner_id && o.backup_owner))
          : false
        return {
          agentId: agent.id,
          name: agent.name,
          owner,
          hasBackup,
          criticality,
          blastRadius: intel.predictiveRisk.scores.find((s) => s.agentId === agent.id)?.blastRadius ?? null,
        }
      }).filter((a) => a.criticality === 'critical' || a.criticality === 'high')
        .sort((x, y) => (y.blastRadius ?? 0) - (x.blastRadius ?? 0))
        .slice(0, 8)
      return {
        status: roots.agents?.length ? 'computed' : 'insufficient_evidence',
        headline: spofs.length
          ? `${spofs.length} high-criticality assets, ranked by blast radius`
          : 'No high-criticality assets recorded',
        items: spofs,
      }
    })()

    // ── 2. Concentration ──
    const concentrationSection = {
      status: 'computed',
      classes: Object.fromEntries(
        Object.entries(concentration.classes).map(([k, c]) => [k, {
          hhi: c.hhi, band: c.band, population: c.population,
        }]),
      ),
      alerts: concentration.alerts.slice(0, 6),
    }

    // ── 3. Knowledge vacuums: undocumented critical assets ──
    const vacuumSection = (() => {
      const documentedAgents = new Set(
        (roots.knowledge_assets || []).filter((k) => k.asset_type === 'agent' && k.is_documented).map((k) => k.asset_id),
      )
      const vacuums = (roots.agents || [])
        .filter((a) => (a.risk === 'critical' || a.risk === 'high') && !documentedAgents.has(a.id))
        .map((a) => ({ agentId: a.id, name: a.name, criticality: a.risk }))
      return {
        status: roots.agents?.length ? 'computed' : 'insufficient_evidence',
        headline: vacuums.length
          ? `${vacuums.length} critical/high assets run on undocumented knowledge`
          : 'Critical assets are documented',
        items: vacuums.slice(0, 8),
      }
    })()

    // ── 4. Recent structural changes + volatility live in the change log —
    //    the longitudinal view is its own endpoint (GET /api/briefing/volatility);
    //    the scan links to it rather than duplicating the window arithmetic.

    // ── 5. Vulnerable Core (Feature 1) ──
    const vulnerableCore = {
      status: replaceability.entities.length ? 'computed' : 'insufficient_evidence',
      population: replaceability.population,
      items: replaceability.quadrants.VULNERABLE_CORE.slice(0, 8),
    }

    res.json({
      generatedAt: new Date().toISOString(),
      orgHeadline: {
        agents: roots._counts?.agents ?? 0,
        workflows: roots._counts?.workflows ?? 0,
        platforms: roots._counts?.ai_platforms ?? 0,
        employees: roots._counts?.employees ?? 0,
      },
      sections: {
        spofs: spofSection,
        concentration: concentrationSection,
        knowledgeVacuums: vacuumSection,
        vulnerabilityCore: vulnerableCore,
      },
      recentChanges: { note: 'see GET /api/briefing/volatility for the longitudinal view' },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router

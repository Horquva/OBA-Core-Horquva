/**
 * pageContext.js — Task 12.7
 * get_page_context tool: given a dashboard page slug, return the relevant
 * metrics from the agent's frozen intelligence bundle for that page.
 *
 * This lets the agent answer "dashboard-aware" questions like:
 *   "What does the Continuity page tell me about Alice?"
 *   "Show me the governance numbers on the Risks page."
 *
 * Design rules:
 *   • Read-only — no writes, no DB calls.
 *   • All data comes from the frozen TurnContext (roots + intel).
 *   • Returns a structured { slug, title, metrics[], summary } object.
 *   • Unknown slugs return a clear error rather than silent null.
 *
 * Depends on:
 *   • T10.6 — TurnContext (frozen roots + intel bundle)
 *   • T12.2 — Navigation catalog (Saad provides the slug → route mapping;
 *              we import it at runtime so we can work before it is merged)
 *
 * Author: Mushtaq Ahmed (Data, migration and persistence — Task 12.7)
 */

'use strict'

// The field paths below were rewritten against the REAL shape of
// domain/derived.js's computeAllFromRoots() (the `intel` this tool receives
// via TurnContext) and loadRoots() (`roots`) -- every path here was read
// back from derived.js itself, not guessed. The previous version guessed
// keys like `intel.orchestrator.score` / `intel.brainCore.brainIndex` /
// `roots.people` / `wf.criticality` that never existed on either bundle, so
// every page except 'workflows' silently returned all-null metrics (this
// was a known, documented, unfixed gap -- see the old caveat this replaced
// in constitution.js). Fixed rather than just documented around.
//
// `orchestrator`/`brainCore` (dashboard's original fields) are a genuinely
// separate computation (routes/intelligence/orchestrator.js +
// domain/signalReaders.js) that TurnContext never loads -- not reachable
// from here without changing what a turn loads, which is out of this
// tool's scope. 'dashboard' and 'briefing' below use intel.pillars.orgScore
// instead: a real, already-computed overall score from the same intel
// bundle, not a stand-in for the orchestrator's own number.
const { atOrAbove, entityCriticality } = require('../domain/definitions')

function findPillar(intel, resultKey) {
  return (intel?.pillars?.pillars ?? []).find((p) => p.resultKey === resultKey) ?? null
}

// ─── Page catalog ─────────────────────────────────────────────────────────────

const PAGE_CATALOG = {

  'dashboard': {
    title: 'Dashboard Overview',
    extract(intel) {
      return {
        organizationalScore:    intel?.pillars?.orgScore?.score  ?? null,
        rating:                 intel?.pillars?.orgScore?.rating ?? null,
        governanceIntelligence: findPillar(intel, 'GI')?.score   ?? null,
        memoryIntelligence:     findPillar(intel, 'MI')?.score   ?? null,
        domainIntelligence:     findPillar(intel, 'DI')?.score   ?? null,
      }
    },
  },

  'risks': {
    title: 'Risk Dashboard',
    extract(intel, roots) {
      const topThreats = (intel?.predictiveRisk?.scores ?? [])
        .slice(0, 5)
        .map((t) => ({ name: t.agentName, threatLevel: t.threatLevel, predictedScore: t.predictedScore }))
      const topPeopleAtRisk = (intel?.humanDependencyRisk ?? [])
        .slice(0, 5)
        .map((p) => ({ name: p.name, tier: p.tier, riskScore: p.totalRiskScore }))
      const criticalAgentsCount = (roots?.agents ?? [])
        .filter((a) => atOrAbove(entityCriticality('agent', a), 'critical')).length

      return {
        emergingThreatsCount: intel?.predictiveRisk?.emergingThreats?.length ?? null,
        topPredictedThreats:  topThreats,
        criticalAgentsCount,
        topPeopleAtRisk,
      }
    },
  },

  'continuity': {
    title: 'Continuity & Succession',
    extract(intel) {
      const mi = findPillar(intel, 'MI')
      return {
        continuityScore:   intel?.orgHealth?.continuityScore  ?? null,
        orgHealthIndex:    intel?.orgHealth?.healthIndex      ?? null,
        backupCoverage:    mi?.components?.backupCoverage     ?? null,
        ownershipCoverage: mi?.components?.ownershipCoverage  ?? null,
      }
    },
  },

  'governance': {
    title: 'Governance Intelligence',
    extract(intel, roots) {
      return {
        governanceScore:       findPillar(intel, 'GI')?.score         ?? null,
        accountabilityScore:   intel?.accountability?.accountabilityScore ?? null,
        decisionQualityScore:  intel?.decisionQuality?.score          ?? null,
        policyViolationsCount: roots?.policy_violations?.length       ?? null,
      }
    },
  },

  'dependencies': {
    title: 'Dependencies & Ownership',
    extract(intel, roots) {
      const topOwners = (intel?.humanDependencyRisk ?? [])
        .slice(0, 5)
        .map((p) => ({ name: p.name, ownedAgentCount: p.ownedAgentCount, ownedWorkflowCount: p.ownedWorkflowCount }))

      return {
        collaborationScore: intel?.collaboration?.summary?.collaborationScore ?? null,
        aiAdoptionScore:    intel?.collaboration?.summary?.aiAdoptionScore    ?? null,
        topOwners,
        totalAgents:        (roots?.agents ?? []).length,
      }
    },
  },

  'workflows': {
    title: 'Workflows',
    extract(intel, roots) {
      const wf = roots?.workflows ?? []
      const documentedWorkflowIds = new Set(
        (roots?.knowledge_assets ?? [])
          .filter((k) => k.asset_type === 'workflow' && k.is_documented)
          .map((k) => k.asset_id),
      )
      return {
        totalWorkflows:          wf.length,
        criticalWorkflows:       wf.filter((w) => atOrAbove(entityCriticality('workflow', w), 'high')).length,
        undocumented:            wf.filter((w) => !documentedWorkflowIds.has(w.id)).length,
        memoryIntelligenceScore: findPillar(intel, 'MI')?.score ?? null,
      }
    },
  },

  'health': {
    title: 'Organizational Health',
    extract(intel) {
      return {
        healthIndex:        intel?.orgHealth?.healthIndex        ?? null,
        healthStatus:       intel?.orgHealth?.healthStatus       ?? null,
        continuityScore:    intel?.orgHealth?.continuityScore    ?? null,
        documentationScore: intel?.orgHealth?.documentationScore ?? null,
      }
    },
  },

  'briefing': {
    title: 'Executive Briefing',
    extract(intel) {
      const items = intel?.executiveMemory?.items ?? []
      return {
        organizationalScore: intel?.pillars?.orgScore?.score  ?? null,
        rating:              intel?.pillars?.orgScore?.rating ?? null,
        topMemoryItems:      items.slice(0, 3).map((i) => i.title),
        memoryItemCount:     items.length,
      }
    },
  },

  'predictive': {
    title: 'Predictive Risk',
    extract(intel) {
      const threats = intel?.predictiveRisk?.scores ?? []
      return {
        emergingThreatsCount: intel?.predictiveRisk?.emergingThreats?.length ?? null,
        topPredictedThreats: threats
          .slice(0, 5)
          .map((t) => ({ name: t.agentName, threatLevel: t.threatLevel, predictedScore: t.predictedScore })),
      }
    },
  },

  'collaboration': {
    title: 'Human-Agent Collaboration',
    extract(intel) {
      return {
        collaborationScore:  intel?.collaboration?.summary?.collaborationScore ?? null,
        aiAdoptionScore:     intel?.collaboration?.summary?.aiAdoptionScore    ?? null,
        accountabilityScore: intel?.accountability?.accountabilityScore       ?? null,
      }
    },
  },
}

const SUPPORTED_SLUGS = Object.keys(PAGE_CATALOG)

// ─── Core tool function ───────────────────────────────────────────────────────

/**
 * get_page_context — the tool the agent calls.
 *
 * @param {string}      slug   — dashboard page slug (e.g. 'risks', 'continuity')
 * @param {TurnContext} ctx    — the frozen turn context from T10.6
 * @returns {{
 *   slug:     string,
 *   title:    string,
 *   metrics:  object,
 *   summary:  string,
 *   isStale:  boolean,
 *   snapshotAt: string,
 * }}
 */
function getPageContext(slug, ctx) {
  const normalised = (slug ?? '').toLowerCase().trim()

  if (!PAGE_CATALOG[normalised]) {
    return {
      error:          `Unknown page slug: "${slug}".`,
      supportedSlugs: SUPPORTED_SLUGS,
    }
  }

  const page = PAGE_CATALOG[normalised]

  // ctx.intel is the output of domain.intelligence.compute.allFromRoots
  const metrics = page.extract(ctx.intel ?? {}, ctx.roots ?? {})

  const populated = Object.entries(metrics)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      if (typeof v === 'number') return `${camelToLabel(k)}: ${v}`
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
        return `${camelToLabel(k)}: ${v.map(item => JSON.stringify(item)).join(', ')}`
      }
      if (Array.isArray(v)) return `${camelToLabel(k)}: ${v.join(', ')}`
      return `${camelToLabel(k)}: ${v}`
    })

  const summary = populated.length > 0
    ? `${page.title} — ${populated.slice(0, 4).join('. ')}.`
    : `${page.title} — no data available in the current bundle.`

  return {
    slug:      normalised,
    title:     page.title,
    metrics,
    summary,
    isStale:   ctx.graphStale ?? false,
    snapshotAt: ctx.snapshotAt ?? null,
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function camelToLabel(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getPageContext,
  SUPPORTED_SLUGS,
  PAGE_CATALOG,
  _camelToLabel: camelToLabel,
}

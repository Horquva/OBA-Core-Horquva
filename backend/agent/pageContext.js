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

// ─── Page catalog ─────────────────────────────────────────────────────────────

const PAGE_CATALOG = {

  'dashboard': {
    title: 'Dashboard Overview',
    extract(intel) {
      return {
        organizationalIntelligenceScore: intel?.orchestrator?.score               ?? null,
        rating:                          intel?.orchestrator?.rating              ?? null,
        brainIndex:                      intel?.brainCore?.brainIndex             ?? null,
        brainPosture:                    intel?.brainCore?.posture                ?? null,
        trustScore:                      intel?.orchestrator?.trustScore          ?? null,
      }
    },
  },

  'risks': {
    title: 'Risk Dashboard',
    extract(intel, roots) {
      const people = roots?.people ?? []
      const topRisk = [...people]
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0))
        .slice(0, 5)
        .map(p => ({ name: p.name, riskScore: p.risk_score ?? 0 }))

      return {
        predictiveRiskScore:  intel?.predictiveRisk?.score   ?? null,
        criticalAgentsCount:  roots?.criticalAgents?.length  ?? null,
        topKeyPersonRisk:     topRisk,
      }
    },
  },

  'continuity': {
    title: 'Continuity & Succession',
    extract(intel, roots) {
      return {
        continuityScore:      intel?.continuity?.score       ?? null,
        agentsWithNoBackup:   roots?.agentsWithNoBackup      ?? null,
        singleOwnerWorkflows: roots?.singleOwnerWorkflows    ?? null,
        orgHealthIndex:       intel?.orgHealth?.score        ?? null,
      }
    },
  },

  'governance': {
    title: 'Governance Intelligence',
    extract(intel) {
      return {
        governanceScore:           intel?.governance?.score          ?? null,
        accountabilityScore:       intel?.accountability?.score      ?? null,
        decisionQualityScore:      intel?.decisionQuality?.score     ?? null,
        separationOfDutyViolations: intel?.governance?.violations    ?? null,
      }
    },
  },

  'dependencies': {
    title: 'Dependencies & Ownership',
    extract(intel, roots) {
      const agents = roots?.agents ?? []
      const topOwned = [...agents]
        .sort((a, b) => (b.owned_count ?? 0) - (a.owned_count ?? 0))
        .slice(0, 5)
        .map(a => ({ name: a.name, ownedCount: a.owned_count ?? 0 }))

      return {
        collaborationScore:    intel?.collaboration?.score    ?? null,
        aiAdoptionScore:       intel?.aiAdoption?.score       ?? null,
        topOwners:             topOwned,
        totalAgents:           agents.length                  ?? null,
      }
    },
  },

  'workflows': {
    title: 'Workflows',
    extract(intel, roots) {
      const wf = roots?.workflows ?? []
      return {
        totalWorkflows:     wf.length,
        criticalWorkflows:  wf.filter(w => w.criticality === 'HIGH').length,
        undocumented:       wf.filter(w => !w.documented).length,
        memoryScore:        intel?.memory?.score              ?? null,
      }
    },
  },

  'health': {
    title: 'Organizational Health',
    extract(intel) {
      return {
        healthIndex:          intel?.orgHealth?.score         ?? null,
        continuityScore:      intel?.continuity?.score        ?? null,
        healthTrendScore:     intel?.healthTrend?.score       ?? null,
        domainIntelligence:   intel?.domainInt?.score         ?? null,
      }
    },
  },

  'briefing': {
    title: 'Executive Briefing',
    extract(intel) {
      return {
        brainIndex:              intel?.brainCore?.brainIndex          ?? null,
        organizationalScore:     intel?.orchestrator?.score            ?? null,
        executiveBriefingScore:  intel?.executiveBriefing?.score       ?? null,
        topRecommendations:      intel?.orchestrator?.recommendations  ?? [],
      }
    },
  },

  'predictive': {
    title: 'Predictive Risk',
    extract(intel, roots) {
      return {
        predictiveRiskScore: intel?.predictiveRisk?.score             ?? null,
        criticalCount:       roots?.criticalAgents?.length            ?? null,
        forecastScore:       intel?.forecast?.score                   ?? null,
      }
    },
  },

  'collaboration': {
    title: 'Human-Agent Collaboration',
    extract(intel) {
      return {
        collaborationScore: intel?.collaboration?.score               ?? null,
        aiAdoptionScore:    intel?.aiAdoption?.score                  ?? null,
        accountabilityScore: intel?.accountability?.score             ?? null,
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
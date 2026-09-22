// backend/agent/suggestions.js
//
// Starter questions for the agent's empty state. These used to be four
// strings hardcoded in frontend/components/agent/EmptyState.tsx, one of
// which named "Sarah" -- a seed-data person who exists in the demo org and
// nowhere else. Every name here is read from the same frozen TurnContext a
// real turn uses (roots + intel), so a prompt can only name someone or
// something the agent can actually answer about.
//
// The page the user came from (a frontend route) picks which set leads.
// Page sets reuse NAVIGATION_CATALOG's slugs so they line up with
// get_page_context / propose_navigation.

'use strict'

const { NAVIGATION_CATALOG } = require('./navigationCatalog')
const { atOrAbove, entityCriticality } = require('../domain/definitions')

const PROMPT_COUNT = 4

// Several slugs share one route (risks/health -> /risk, continuity/governance
// -> /continuity, dashboard/briefing -> /dashboard). The first slug listed in
// the catalog for a route wins, which is the page's primary identity.
function slugForRoute(route) {
  if (typeof route !== 'string' || !route) return null
  const path = route.split(/[?#]/)[0]
  for (const [slug, page] of Object.entries(NAVIGATION_CATALOG)) {
    if (path === page.route || path.startsWith(page.route + '/')) return slug
  }
  return null
}

function pickFacts(ctx) {
  const intel = ctx?.intel ?? {}
  const roots = ctx?.roots ?? {}

  const person = intel.humanDependencyRisk?.[0]?.name ?? null
  const secondPerson = intel.humanDependencyRisk?.[1]?.name ?? null
  const threat = intel.predictiveRisk?.scores?.[0] ?? null

  const workflows = roots.workflows ?? []
  const criticalWorkflow =
    workflows.find((w) => atOrAbove(entityCriticality('workflow', w), 'critical')) ??
    workflows.find((w) => atOrAbove(entityCriticality('workflow', w), 'high')) ??
    null

  return {
    person,
    secondPerson,
    agent: threat?.agentName ?? null,
    threatLevel: threat?.threatLevel ? threat.threatLevel.toLowerCase() : null,
    workflow: criticalWorkflow?.name ?? null,
  }
}

// Each entry is [prompt, ...facts it needs]. A prompt whose facts are
// missing is skipped rather than rendered with a blank in it.
function candidatesFor(slug, f) {
  const leaves = f.person && `What happens if ${f.person} leaves?`
  const whyAgent = f.agent && f.threatLevel && `Why is ${f.agent} rated ${f.threatLevel} risk?`
  const backup = f.person && `Who could back up ${f.person}?`
  const ownsWorkflow = f.workflow && `Who owns ${f.workflow}, and is there a backup?`

  const general = [
    "What's our biggest organizational risk right now?",
    leaves,
    whyAgent,
    'Which department is most exposed?',
    'Who owns the most critical workflows?',
    'How healthy is the organization overall?',
  ]

  const byPage = {
    risks: [whyAgent, leaves, 'Which emerging threats should I act on first?', "What's dragging down our org health?"],
    health: ["What's dragging down our org health?", leaves, 'Which department is most exposed?'],
    predictive: [whyAgent, 'Which emerging threats should I act on first?', f.agent && `What breaks if ${f.agent} fails?`],
    continuity: [leaves, backup, 'Who has critical work with no backup?', f.secondPerson && `What happens if ${f.secondPerson} leaves?`],
    governance: ['Where are our accountability gaps?', 'How is our decision quality trending?', leaves],
    dependencies: [f.person && `What does ${f.person} own?`, 'Where is ownership most concentrated?', backup],
    workflows: [ownsWorkflow, 'Which critical workflows are undocumented?', f.workflow && `What happens if ${f.workflow} stops?`],
    collaboration: ['Where is AI adoption lagging?', 'Which agents have weak human oversight?', whyAgent],
    dashboard: general,
    briefing: general,
  }

  return [...(byPage[slug] ?? []), ...general]
}

/**
 * @param {object} ctx       TurnContext (roots + intel) -- see turnContext.js
 * @param {string|null} slug NAVIGATION_CATALOG slug of the page the user came from
 * @returns {{ slug: string|null, pageLabel: string|null, prompts: string[] }}
 */
function buildSuggestions(ctx, slug) {
  const known = slug && NAVIGATION_CATALOG[slug] ? slug : null
  const facts = pickFacts(ctx)

  const prompts = []
  for (const p of candidatesFor(known, facts)) {
    if (p && !prompts.includes(p)) prompts.push(p)
    if (prompts.length === PROMPT_COUNT) break
  }

  return {
    slug: known,
    pageLabel: known ? NAVIGATION_CATALOG[known].label : null,
    prompts,
  }
}

module.exports = { buildSuggestions, slugForRoute }

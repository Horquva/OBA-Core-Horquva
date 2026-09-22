/**
 * navigationCatalog.js — Task 12.2
 * Maps a dashboard page slug to its real frontend route and a human label.
 *
 * The slugs here are kept identical to PAGE_CATALOG in agent/pageContext.js
 * (T12.7) on purpose — the two catalogs describe the same set of pages from
 * two angles: pageContext.js pulls metrics for a page, this pulls where to
 * actually send the user. pageContext.js's own header comment already
 * expects to import a slug -> route mapping from this task at runtime.
 *
 * Routes were confirmed against the real frontend/app pages rather than
 * guessed:
 *   - risks/health share /risk (OrgHealthBanner lives there alongside the
 *     risk panels)
 *   - governance shares /continuity (GovernanceTab is a tab on that page,
 *     not a separate route)
 *   - dashboard/briefing share /dashboard (W-L Phase 3 moved the dashboard
 *     off root -- / is now the agent's own fullscreen route, per D-77)
 *   - dependencies -> /ownership (Ownership Intelligence), not /map --
 *     /map is a dependency graph visualization, a different thing from the
 *     ownership-concentration metrics PAGE_CATALOG['dependencies'] extracts
 *   - predictive -> /forecast, collaboration -> /org-science (both matched
 *     directly on page title/imports)
 *
 * Design rules:
 *   • Read-only, static data. No DB calls, nothing computed at runtime.
 *   • Exported so any module (pageContext.js included) can resolve a route
 *     for a slug without duplicating this list.
 *
 * Author: Ahmed Abubakr (Backend, Domain Layer & Simulations — Task 12.2)
 */

'use strict'

const NAVIGATION_CATALOG = {
  dashboard:     { route: '/dashboard',   label: 'Executive Command Center' },
  risks:         { route: '/risk',        label: 'Risk Dashboard' },
  continuity:    { route: '/continuity',  label: 'Continuity & Succession' },
  governance:    { route: '/continuity',  label: 'Governance Intelligence' },
  dependencies:  { route: '/ownership',   label: 'Dependencies & Ownership' },
  workflows:     { route: '/workflows',   label: 'Workflows' },
  health:        { route: '/risk',        label: 'Organizational Health' },
  briefing:      { route: '/dashboard',   label: 'Executive Briefing' },
  predictive:    { route: '/forecast',    label: 'Predictive Risk' },
  collaboration: { route: '/org-science', label: 'Human-Agent Collaboration' },
}

const SUPPORTED_SLUGS = Object.keys(NAVIGATION_CATALOG)

/**
 * @param {string} slug
 * @returns {{ route: string, label: string } | null}
 */
function getRoute(slug) {
  const normalised = (slug ?? '').toLowerCase().trim()
  return NAVIGATION_CATALOG[normalised] ?? null
}

module.exports = { NAVIGATION_CATALOG, SUPPORTED_SLUGS, getRoute }
/**
 * OBA Core — tenant context (Phase 1.2, sql/20_multi_tenancy.sql).
 *
 * Every business table carries org_id now, and RLS (keyed on the
 * `app.current_org` GUC) is defense-in-depth. The PRIMARY enforcement is
 * application-level scoping, and this module is its single point:
 *
 *   - `runWithTenant` middleware: mounted globally right after requireAuth.
 *     Resolves the JWT's org slug to the orgs-table uuid, stores it in an
 *     AsyncLocalStorage request context, and mirrors it on `req.orgId`.
 *
 *   - `currentOrgId()`: the request's org uuid — read ANYWHERE downstream
 *     (domain/derived.js loadRoots, brain/knowledge/graphLoader.js, route
 *     handlers) without threading `req` through every call site. Null when
 *     there is no request context (offline tests, cron-style jobs).
 *
 *   - `applyOrgScope(query)`: the one scoping primitive every direct read
 *     goes through — `query.eq('org_id', orgId)` inside a request, the query
 *     unchanged outside one. Writes record org_id through the same helper.
 *
 * Resolution outcomes (deliberate, documented):
 *   resolved    — slug found in orgs; requests run scoped to that uuid.
 *   unknown-org — orgs table reachable, slug absent: a token claiming an
 *                 organization the database does not know. Hard 403, never
 *                 a silent fallback to unscoped.
 *   degraded    — Supabase unreachable or the orgs table missing (pre-20
 *                 database, or the offline test suites that stub Supabase
 *                 with in-memory fixtures): runs UNSCOPED — the legacy
 *                 single-tenant behavior — with a one-per-minute warning.
 */

const { AsyncLocalStorage } = require('async_hooks')

const tenantContext = new AsyncLocalStorage()

const BOOTSTRAP_ORG_SLUG = 'horquva'
const RESOLVE_TTL_MS = 60_000

let orgIdCache = new Map() // slug -> { orgId, resolvedAt }
let degradationWarnedAt = 0

/**
 * Resolves a slug to an org uuid.
 * @returns {Promise<{mode: 'resolved'|'unknown-org'|'degraded', orgId: string|null}>}
 */
async function resolveOrgId(supabase, slug) {
  if (!slug) return { mode: 'degraded', orgId: null }
  const cached = orgIdCache.get(slug)
  if (cached && Date.now() - cached.resolvedAt < RESOLVE_TTL_MS) {
    return { mode: 'resolved', orgId: cached.orgId }
  }

  try {
    const { data, error } = await supabase.from('orgs').select('id, slug').eq('slug', slug).maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return { mode: 'unknown-org', orgId: null }
    orgIdCache.set(slug, { orgId: data.id, resolvedAt: Date.now() })
    return { mode: 'resolved', orgId: data.id }
  } catch (err) {
    if (Date.now() - degradationWarnedAt > RESOLVE_TTL_MS) {
      degradationWarnedAt = Date.now()
      console.warn(`[tenant] degrading to UNSCOPED single-tenant mode — cannot resolve org '${slug}': ${err.message}`)
    }
    return { mode: 'degraded', orgId: null }
  }
}

function safeSupabase() {
  try {
    return require('../supabase')
  } catch (_) {
    return null
  }
}

/** Express middleware. Requires requireAuth to have run first. */
function runWithTenant(req, res, next) {
  const supabase = safeSupabase()
  resolveOrgId(supabase, req.org).then(({ mode, orgId }) => {
    if (mode === 'unknown-org') {
      return res.status(403).json({ error: `Unknown organization '${req.org}'` })
    }
    req.orgId = orgId
    tenantContext.run({ orgId }, () => next())
  }).catch(next)
}

/** The request's org uuid, or null outside a tenant context. */
function currentOrgId() {
  return tenantContext.getStore()?.orgId ?? null
}

/** The single scoping primitive — wrap any query builder before awaiting it. */
function applyOrgScope(query) {
  const orgId = currentOrgId()
  return orgId ? query.eq('org_id', orgId) : query
}

/** Test hook: run a function inside an explicit tenant context. */
function runAsOrg(orgId, fn) {
  return tenantContext.run({ orgId }, fn)
}

function _resetForTests() {
  orgIdCache = new Map()
  degradationWarnedAt = 0
}

module.exports = {
  BOOTSTRAP_ORG_SLUG,
  runWithTenant,
  currentOrgId,
  applyOrgScope,
  runAsOrg,
  resolveOrgId,
  _resetForTests,
}

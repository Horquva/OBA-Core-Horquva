/**
 * OBA Core — orgGuard (Phase 1.2).
 *
 * This used to be a single-tenant tripwire: no business table carried an org
 * column, so a second organization in app_users meant two orgs silently
 * sharing one dataset, and the response was to refuse to boot. That position
 * is obsolete. sql/20_multi_tenancy.sql puts org_id on every business table
 * with RLS policies, and lib/tenant.js scopes every read and write per
 * request. A second organization is now a supported state.
 *
 * The check remains as an informational boot report: it lists how many
 * organizations app_users holds, so an unexpected number (data pollution,
 * a typo'd org slug at registration) is visible in the logs at startup.
 * It never throws and never exits.
 *
 * Real enforcement lives in middleware/auth.js (authentication) and
 * lib/tenant.js (per-request tenant binding + query scoping).
 */

const BANNER = '='.repeat(78)

/**
 * Reports whether app_users holds more than one organization.
 * Never throws and never exits — callers may ignore the result.
 *
 * @returns {Promise<{ok: boolean, orgs: string[], reason?: string}>}
 */
async function checkSingleTenant() {
	let supabase = null
	try {
		supabase = require('../supabase')
	} catch (_) {
		supabase = null
	}
	if (!supabase) return { ok: true, orgs: [], reason: 'no-supabase' }

	try {
		const { data, error } = await supabase.from('app_users').select('org')
		if (error) return { ok: true, orgs: [], reason: error.message }

		const orgs = [...new Set((data || []).map((r) => r.org).filter(Boolean))].sort()
		return { ok: orgs.length <= 1, orgs }
	} catch (err) {
		return { ok: true, orgs: [], reason: err.message }
	}
}

/** Runs the check and prints an informational report when it is interesting. */
async function assertSingleTenant() {
	const result = await checkSingleTenant()
	if (result.orgs.length > 1) {
		console.log(BANNER)
		console.log('ORGANIZATIONS IN app_users: ' + result.orgs.length)
		console.log('  ' + result.orgs.join(', '))
		console.log('Each is isolated per request by lib/tenant.js (org_id scoping + RLS).')
		console.log(BANNER)
	}
	return result
}

module.exports = { checkSingleTenant, assertSingleTenant }

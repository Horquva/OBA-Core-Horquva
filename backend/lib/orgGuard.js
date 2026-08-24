/**
 * OBA Core — single-tenant guard.
 *
 * OBA Core is single-tenant today, and not merely by convention: NO business
 * table carries an org column. `org` exists only on app_users and as a JWT
 * claim, so `req.org` has nothing to filter against. Every authenticated user
 * therefore sees the same organization's data, whatever their token says.
 *
 * That is a supportable position for one customer. It stops being supportable
 * the moment a second `org` value appears in app_users, because at that point
 * the product is implying an isolation it does not implement. This check makes
 * that transition loud instead of silent.
 *
 * It WARNS rather than refusing to boot, deliberately. A hard exit fails in the
 * wrong direction: it would take down a working deployment over a data
 * condition, and would also kill local development whenever Supabase happens to
 * be unreachable. The condition needs an operator, not an outage.
 *
 * Real tenancy is its own workstream: org_id across the schema, a backfill, and
 * a scoped query helper the route files go through.
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

/** Runs the check and prints an unmissable warning when it fails. */
async function assertSingleTenant() {
	const result = await checkSingleTenant()
	if (!result.ok) {
		console.error(BANNER)
		console.error('SINGLE-TENANT ASSUMPTION VIOLATED — app_users holds ' + result.orgs.length + ' organizations:')
		console.error('  ' + result.orgs.join(', '))
		console.error('')
		console.error('No business table has an org column, so these accounts all read the SAME')
		console.error('data regardless of their org claim. Users of one organization can see')
		console.error('another\'s. Either consolidate app_users onto one org, or stop issuing')
		console.error('accounts until real tenant scoping is implemented.')
		console.error(BANNER)
	}
	return result
}

module.exports = { checkSingleTenant, assertSingleTenant }

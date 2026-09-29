/*
 * OBA Core — tenant context tests (Phase 1.2, sql/20_multi_tenancy.sql).
 *
 * Pins lib/tenant.js's three resolution outcomes and the scoping primitive:
 *   resolved    — slug found in the orgs table → queries filter by org_id,
 *   unknown-org — orgs table answers, slug absent → runWithTenant 403s,
 *   degraded    — Supabase unreachable / orgs table missing → unscoped
 *                 legacy behavior with a warning (what the offline test
 *                 suites rely on).
 *
 * Run from backend/:  node tests/tenant.unit.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const ORG_ID = '00000000-0000-4000-8000-000000000001'

function stubSupabase(orgsTable) {
	const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
	require.cache[supabasePath] = {
		id: supabasePath, filename: supabasePath, loaded: true,
		exports: {
			from: (table) => {
				if (table !== 'orgs') throw new Error('tenant test: unexpected table ' + table)
				return {
					select: () => ({
						eq: (_col, slug) => ({
							maybeSingle: async () => {
								const row = (orgsTable || []).find((o) => o.slug === slug)
								return { data: row ? { id: row.id, slug: row.slug } : null, error: null }
							},
						}),
					}),
				}
			},
		},
	}
}

const tenant = require('../lib/tenant')

async function main() {
	console.log('\n=== OBA Core — tenant context tests ===\n')

	console.log('resolveOrgId outcomes:')
	{
		tenant._resetForTests()
		stubSupabase([{ id: ORG_ID, slug: 'horquva' }])
		const resolved = await tenant.resolveOrgId(require('../supabase'), 'horquva')
		check('known slug → resolved with the org uuid', resolved.mode === 'resolved' && resolved.orgId === ORG_ID, resolved)

		tenant._resetForTests()
		stubSupabase([{ id: ORG_ID, slug: 'horquva' }])
		const unknown = await tenant.resolveOrgId(require('../supabase'), 'nope')
		check('unknown slug → unknown-org (fail closed at the middleware)', unknown.mode === 'unknown-org' && unknown.orgId === null, unknown)

		tenant._resetForTests()
		stubSupabase(null) // orgs table reachable but empty rows still resolve via find; null table = unreachable
		require.cache[require.resolve(path.join(__dirname, '..', 'supabase.js'))].exports.from = () => {
			throw new Error('connection refused')
		}
		const degraded = await tenant.resolveOrgId(require('../supabase'), 'horquva')
		check('unreachable supabase → degraded (unscoped legacy mode)', degraded.mode === 'degraded' && degraded.orgId === null, degraded)
	}

	console.log('\napplyOrgScope / request context:')
	{
		tenant._resetForTests()
		let eqCalls = 0
		const fakeQuery = { eq: (col, val) => { eqCalls++; return { col, val } } }
		const outside = tenant.applyOrgScope(fakeQuery)
		check('outside a tenant context the query is unchanged', outside === fakeQuery && eqCalls === 0, { eqCalls })

		await tenant.runAsOrg(ORG_ID, () => {
			const scoped = tenant.applyOrgScope(fakeQuery)
			check('inside a tenant context the query gains org_id eq', scoped && scoped.col === 'org_id' && scoped.val === ORG_ID, scoped)
			check('currentOrgId() reads the context', tenant.currentOrgId() === ORG_ID, tenant.currentOrgId())
		})
		check('context does not leak after runAsOrg', tenant.currentOrgId() === null, tenant.currentOrgId())
	}

	console.log('\nrunWithTenant middleware (HTTP-level):')
	{
		tenant._resetForTests()
		stubSupabase([{ id: ORG_ID, slug: 'horquva' }])
		const express = require('express')
		const { runWithTenant } = tenant
		const app = express()
		app.use('/api', (req, _res, next) => { req.org = 'horquva'; next() })
		app.use('/api', runWithTenant)
		app.get('/api/ping', (req, res) => res.json({ orgId: req.orgId }))
		const server = app.listen(0)
		await new Promise((r) => server.once('listening', r))
		const port = server.address().port
		const res = await fetch(`http://127.0.0.1:${port}/api/ping`)
		const body = await res.json()
		check('known org → request carries req.orgId', res.status === 200 && body.orgId === ORG_ID, body)
		server.close()
	}
	{
		tenant._resetForTests()
		stubSupabase([{ id: ORG_ID, slug: 'horquva' }])
		const express = require('express')
		const app = express()
		app.use('/api', (req, _res, next) => { req.org = 'ghost-org'; next() })
		app.use('/api', tenant.runWithTenant)
		app.get('/api/ping', (_req, res) => res.json({ ok: true }))
		const server = app.listen(0)
		await new Promise((r) => server.once('listening', r))
		const port = server.address().port
		const res = await fetch(`http://127.0.0.1:${port}/api/ping`)
		check('unknown org slug → hard 403', res.status === 403, res.status)
		server.close()
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'TENANT CONTEXT TESTS PASSED ✅' : 'TENANT CONTEXT TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})

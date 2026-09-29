/*
 * OBA Core — Ingestion receiver tests (Phase 4.3).
 *
 * Covers /api/ingest: per-source HMAC verification (GitHub native, Slack
 * native, Standard Webhooks convention), fail-closed when a source's secret
 * is unset, tampered-body rejection, replay-window enforcement, verbatim
 * staging, and the CSV roster importer's parse + staging. Stubs Supabase
 * in-memory; signatures computed for real with the test secret.
 *
 * Run from backend/:  node tests/ingestWebhook.test.js
 */

const path = require('path')
const crypto = require('crypto')

process.env.JWT_SECRET = 'test-secret-for-ingest'
process.env.INGEST_SECRET_GITHUB = 'github-test-secret'
process.env.INGEST_SECRET_SLACK = 'slack-test-secret'
process.env.INGEST_SECRET_GENERIC = 'generic-test-secret'
delete process.env.INGEST_SECRET_JIRA // fail-closed path

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const ORG_ID = '00000000-0000-4000-8000-000000000001'
const stagedRows = []
const employees = [
	{ id: 'e0000000-0000-4000-8000-000000000001', name: 'Alice', email: 'alice@horquva.com', role: null, department: null, org_id: ORG_ID },
]
const bridgeRows = []
const changeLogRows = []
const auditRows = []

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = {
	id: supabasePath, filename: supabasePath, loaded: true,
	exports: {
		from(table) {
			if (table === 'orgs') {
				return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: ORG_ID, slug: 'horquva' }, error: null }) }) }) }
			}
			if (table === 'audit_log') {
				return { insert: async (rows) => { auditRows.push(...rows); return { data: null, error: null } } }
			}
			if (table === 'raw_vendor_payloads') {
				return {
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						const withIds = arr.map((r) => ({ ...r, id: `st-${stagedRows.length + 1}` }))
						stagedRows.push(...withIds)
						return {
							select: () => ({
								maybeSingle: async () => ({ data: withIds[0] || null, error: null }),
							}),
						}
					},
					select() {
						const build = (filters) => ({
							eq: (col, val) => build([...filters, [col, val]]),
							maybeSingle: async () => {
								const f = filters.find(([c]) => c === 'id')
								return { data: stagedRows.find((r) => r.id === f?.[1]) || null, error: null }
							},
						})
						return build([])
					},
					update(patch) {
						return { eq: () => ({ async then(resolve) { resolve({ data: null, error: null }) } }) }
					},
				}
			}
			if (table === 'identity_bridge') {
				return {
					select() {
						const build = (filters) => ({
							eq: (col, val) => build([...filters, [col, val]]),
							maybeSingle: async () => {
								const sys = filters.find(([c]) => c === 'external_system')?.[1]
								const uid = filters.find(([c]) => c === 'external_user_id')?.[1]
								return { data: bridgeRows.find((r) => r.external_system === sys && r.external_user_id === uid) || null, error: null }
							},
						})
						return build([])
					},
					upsert: async (row) => {
						const existing = bridgeRows.find((r) => r.org_id === row.org_id && r.external_system === row.external_system && r.external_user_id === row.external_user_id)
						if (existing) Object.assign(existing, row)
						else bridgeRows.push({ ...row })
						return { data: row, error: null }
					},
				}
			}
			if (table === 'employees') {
				return {
					select() {
						const build = (filters) => ({
							eq: (col, val) => build([...filters, [col, val]]),
							ilike: (col, val) => build([...filters, [col, val]]),
							maybeSingle: async () => {
								const f = Object.fromEntries(filters)
								const row = employees.find((r) => (f.email ? String(r.email).toLowerCase() === String(f.email).toLowerCase() : true) && (!f.id || r.id === f.id))
								return { data: row ? { ...row } : null, error: null }
							},
						})
						return build([])
					},
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						const withIds = arr.map((r) => ({ ...r, id: `e-new-${employees.length + 1}` }))
						employees.push(...withIds)
						return { select: () => ({ maybeSingle: async () => ({ data: withIds[0] || null, error: null }) }) }
					},
					update(patch) {
						return { eq: (col, val) => ({ async then(resolve) { const row = employees.find((r) => r.id === val); if (row) Object.assign(row, patch); resolve({ data: row ? { ...row } : null, error: null }) } }) }
					},
				}
			}
			if (table === 'dependency_change_log') {
				return {
					insert(input) {
						const arr = Array.isArray(input) ? input : [input]
						for (const r of arr) changeLogRows.push({ ...r, id: `cl-${changeLogRows.length + 1}` })
						return {
							select: () => ({
								maybeSingle: async () => ({ data: changeLogRows[changeLogRows.length - 1] || null, error: null }),
							}),
						}
					},
					select() {
						const build = (filters) => ({
							eq: (col, val) => build([...filters, [col, val]]),
							maybeSingle: async () => {
								const key = filters.find(([c]) => c === 'idempotency_key')?.[1]
								return { data: (key ? changeLogRows.find((r) => r.idempotency_key === key) : null) || null, error: null }
							},
						})
						return build([])
					},
				}
			}
			if (table in { agents: 1, workflows: 1, workflow_failures: 1, workflow_runbooks: 1, workflow_steps: 1, dependencies: 1, knowledge_assets: 1, tool_users: 1, employee_agent: 1, ai_platforms: 1, tool_policies: 1, policy_violations: 1, tool_ownership: 1, accountability_entities: 1, accountability_links: 1, truth_claims: 1, decision_history: 1, agent_platform: 1, workflow_dependencies: 1, tool_backups: 1, owners: 1 }) {
				// chainable + thenable: applyOrgScope adds .eq('org_id', ...) in a
				// tenant context (processStaged runs inside runAsOrg)
				const build = () => ({
					eq: () => build(),
					then(resolve, reject) { return Promise.resolve({ data: [], error: null }).then(resolve, reject) },
				})
				return { select: () => build() }
			}
			throw new Error(`ingestWebhook.test.js: unexpected table '${table}'`)
		},
	},
}

const express = require('express')
const ingestRoute = require('../routes/ingest/webhook')

const app = express()
// IMPORTANT: the real router parses raw/text bodies itself (signature
// verification needs exact bytes) — no express.json() here.
app.use('/api/ingest', ingestRoute)

function signGitHub(body) {
	return 'sha256=' + crypto.createHmac('sha256', 'github-test-secret').update(body).digest('hex')
}
function signSlack(body, ts) {
	return 'v0=' + crypto.createHmac('sha256', 'slack-test-secret').update(`v0:${ts}:${body}`).digest('hex')
}
function signStandard(id, ts, body) {
	return 'v1=' + crypto.createHmac('sha256', 'generic-test-secret').update(`${id}.${ts}.${body}`).digest('hex')
}

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function post(p, body, headers = {}) {
		const res = await fetch(base + p, { method: 'POST', headers, body })
		return { status: res.status, json: await res.json().catch(() => ({})) }
	}

	console.log('\n=== OBA Core — Ingestion receiver tests ===\n')

	console.log('github source:')
	{
		const body = JSON.stringify({ ref: 'main', pusher: { name: 'octocat' } })
		const ok = await post('/api/ingest/webhook/github', body, { 'Content-Type': 'application/json', 'x-hub-signature-256': signGitHub(body), 'x-github-delivery': 'evt-1' })
		check('valid signature — 202 staged', ok.status === 202 && ok.json.stagingId, ok)
		check('payload staged verbatim', stagedRows[0]?.payload?.ref === 'main' && stagedRows[0]?.source === 'github', stagedRows[0]?.payload)

		const tampered = await post('/api/ingest/webhook/github', body + ' ', { 'Content-Type': 'application/json', 'x-hub-signature-256': signGitHub(body) })
		check('tampered body — 401', tampered.status === 401, tampered.status)
		const missing = await post('/api/ingest/webhook/github', body, { 'Content-Type': 'application/json' })
		check('missing signature — 401', missing.status === 401, missing.status)
	}

	console.log('\nslack source:')
	{
		const ts = String(Math.floor(Date.now() / 1000))
		const body = 'token=abc&team_id=T1'
		const ok = await post('/api/ingest/webhook/slack', body, { 'Content-Type': 'application/x-www-form-urlencoded', 'x-slack-request-timestamp': ts, 'x-slack-signature': signSlack(body, ts) })
		check('valid slack signature — 202', ok.status === 202, ok.status)
		const staleTs = String(Math.floor(Date.now() / 1000) - 3600)
		const stale = await post('/api/ingest/webhook/slack', body, { 'Content-Type': 'application/x-www-form-urlencoded', 'x-slack-request-timestamp': staleTs, 'x-slack-signature': signSlack(body, staleTs) })
		check('stale timestamp (replay) — 401', stale.status === 401, stale.status)
	}

	console.log('\nstandard-webhooks sources (generic):')
	{
		const id = 'wh-1'
		const ts = String(Math.floor(Date.now() / 1000))
		const body = JSON.stringify({ event: 'workflow.created' })
		const ok = await post('/api/ingest/webhook/generic', body, { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': signStandard(id, ts, body) })
		check('valid standard-webhooks signature — 202', ok.status === 202, ok.status)
		const bad = await post('/api/ingest/webhook/generic', body, { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': ts, 'webhook-signature': 'v1=deadbeef' })
		check('wrong signature — 401', bad.status === 401, bad.status)
	}

	console.log('\nfail-closed unconfigured source:')
	{
		const body = JSON.stringify({})
		const r = await post('/api/ingest/webhook/jira', body, { 'Content-Type': 'application/json' })
		check('unset secret — 503, nothing staged', r.status === 503 && stagedRows.every((s) => s.source !== 'jira'), r.status)
	}

	console.log('\nunknown source:')
	{
		const r = await post('/api/ingest/webhook/facebook', '{}', { 'Content-Type': 'application/json' })
		check('unknown source — 404', r.status === 404, r.status)
	}

	console.log('\nCSV roster importer:')
	{
		// Alice's email matches the existing employee (exact-email path →
		// EMPLOYEE_UPDATED + bridge); Carol is new (EMPLOYEE_CREATED)
		const csv = 'name,email,role,department\nAlice A.,alice@horquva.com,Staff Engineer,Eng\nCarol Jones,carol@horquva.com,Analyst,Data\n'
		const r = await post('/api/ingest/roster/csv', csv, { 'Content-Type': 'text/csv' })
		check('csv — 202 staged with people count', r.status === 202 && r.json.people === 2, r.json)
		// async processor: give the setImmediate chain a moment
		await new Promise((res) => setTimeout(res, 300))
		check('roster translated through the mutation layer', changeLogRows.filter((c) => c.mutation_type === 'EMPLOYEE_CREATED' || c.mutation_type === 'EMPLOYEE_UPDATED').length >= 2, { log: changeLogRows.map((c) => c.mutation_type), staged: stagedRows.map((r) => [r.source, r.status, r.error_message]) })
		check('exact-email match bridges to the existing employee',
			bridgeRows.some((b) => b.match_method === 'exact_email' && b.verified_email === 'alice@horquva.com' && b.employee_id === 'e0000000-0000-4000-8000-000000000001'), bridgeRows)
		const created = employees.find((e) => e.name === 'Carol Jones')
		check('unmatched person created via EMPLOYEE_CREATED', Boolean(created), employees.map((e) => e.name))
		check('matched person updated, not duplicated', employees.filter((e) => e.email === 'alice@horquva.com').length === 1, employees.map((e) => [e.name, e.email]))
		const bad = await post('/api/ingest/roster/csv', '', { 'Content-Type': 'text/csv' })
		check('empty csv — 400', bad.status === 400, bad.status)
	}

	console.log('\naudit:')
	check('rejected webhooks audited', auditRows.some((a) => a.action === 'ingest.webhook' && a.outcome === 'failure'), auditRows.map((a) => a.action))
	check('accepted webhooks audited', auditRows.some((a) => a.action === 'ingest.webhook' && a.outcome === 'success'))

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'INGEST RECEIVER TESTS PASSED ✅' : 'INGEST RECEIVER TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})

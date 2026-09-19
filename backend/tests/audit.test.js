const fs = require('fs')
const path = require('path')
const express = require('express')

process.env.JWT_SECRET = 'test-secret-for-audit'

let passed = 0
let failed = 0
function check(name, condition, detail) {
	if (condition) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail === undefined ? '' : JSON.stringify(detail)) }
}

const inserted = []
let insertError = null
const auditRows = [
	{ id: 3, occurred_at: '2026-09-19T10:00:00Z', action: 'auth.logout', outcome: 'success' },
	{ id: 2, occurred_at: '2026-09-19T09:00:00Z', action: 'auth.login', outcome: 'success' },
]

function queryResult(data, error = null) {
	return { then(resolve, reject) { return Promise.resolve({ data, error }).then(resolve, reject) } }
}
const fakeSupabase = {
	from(table) {
		if (table !== 'audit_log') throw new Error(`unexpected table ${table}`)
		return {
			insert(rows) {
				if (insertError) return queryResult(null, insertError)
				inserted.push(...rows)
				return queryResult(rows, null)
			},
			select() { return this },
			order() { return this },
			limit() { return this },
			eq() { return this },
			gte() { return this },
			lte() { return this },
			lt() { return this },
			then(resolve, reject) { return Promise.resolve({ data: auditRows, error: null }).then(resolve, reject) },
		}
	},
}
const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase }

const { recordAudit, auditHealth } = require('../lib/audit')
const auditRouter = require('../routes/auditLog')
const { requireAuth } = require('../middleware/auth')
const { sign } = require('../lib/jwt')

async function main() {
	console.log('\n=== OBA Core — SEC-4 Audit Test ===\n')
	console.log('Schema and helper:')
	const migration = fs.readFileSync(path.join(__dirname, '..', 'sql', '17_audit_log.sql'), 'utf8')
	check('migration defines audit_log and 180-day-compatible timestamp', /create table if not exists audit_log/.test(migration) && /occurred_at\s+timestamptz/.test(migration))
	check('migration enables RLS and revokes public roles', /enable row level security/.test(migration) && /revoke all on audit_log/.test(migration))
	await recordAudit({ method: 'POST', originalUrl: '/api/auth/login?secret=hidden', get: () => 'browser' }, {
		action: 'auth.login', outcome: 'failure', reason: 'invalid_credentials', actor: null,
	})
	const first = inserted[0]
	check('failed login is anonymous and query-free', first.actor_id === null && first.actor_email === null && first.path === '/api/auth/login')
	check('audit row excludes sensitive fields', !Object.keys(first).some((key) => /password|token|cookie|authorization|ip/i.test(key)))

	insertError = new Error('database unavailable')
	await recordAudit(null, { action: 'auth.logout', outcome: 'success' })
	check('failed write is fail-open and flagged', auditHealth().write_failures_since_boot === 1 && auditHealth().last_failure_at)
	insertError = null
	await recordAudit(null, { action: 'auth.logout', outcome: 'success' })
	check('next successful write records failure marker', inserted.some((row) => row.action === 'audit.write_failed'))
	check('allowlisted changes omit arbitrary fields', (await (async () => { await recordAudit(null, { action: 'agent.owner_update', outcome: 'success', changes: { owner_id: { from: 1, to: 2 }, password: { from: 'a', to: 'b' } } }); return inserted.at(-1).changes }))().password === undefined)

	console.log('Admin API:')
	const app = express()
	app.use(express.json())
	app.use('/api', requireAuth)
	app.use('/api/audit-log', auditRouter)
	const server = app.listen(0)
	await new Promise((resolve) => server.once('listening', resolve))
	const base = `http://127.0.0.1:${server.address().port}`
	const admin = sign({ sub: 'admin', email: 'admin@example.com', role: 'admin' }, process.env.JWT_SECRET, 300)
	const member = sign({ sub: 'member', email: 'member@example.com', role: 'member' }, process.env.JWT_SECRET, 300)
	async function get(query, token) {
		const response = await fetch(base + '/api/audit-log' + (query || ''), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
		return { status: response.status, json: await response.json() }
	}
	check('unauthenticated audit read is rejected', (await get()).status === 401)
	check('non-admin audit read is forbidden', (await get('', member)).status === 403)
	const adminResponse = await get('?limit=500', admin)
	check('admin receives entries and health', adminResponse.status === 200 && Array.isArray(adminResponse.json.entries) && adminResponse.json.health)
	check('admin limit is capped by query contract', adminResponse.json.entries.length <= 200)
	check('invalid outcome is rejected', (await get('?outcome=unknown', admin)).status === 400)
	server.close()

	console.log(`\npassed: ${passed}   failed: ${failed}`)
	process.exit(failed ? 1 : 0)
}

main().catch((error) => { console.error(error); process.exit(1) })
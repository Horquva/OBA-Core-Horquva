/*
 * OBA Core — Auth ROUTE test (the first route-level test in this repo).
 *
 * auth.unit.test.js covers the pure helpers (jwt, password). This covers the
 * HTTP surface, because the vulnerabilities it guards were never in those
 * helpers — they were in what the route handlers accepted from the request.
 *
 * Boots the real auth router on an ephemeral port and calls it over HTTP with
 * Node's built-in fetch. No supertest, no jest — same no-framework style as the
 * rest of tests/.
 *
 * Supabase is stubbed by pre-seeding require.cache with a small in-memory fake,
 * so this runs offline and deterministically. The fake implements only the
 * query shapes auth.js actually uses.
 *
 * Run from backend/:  node tests/authRoutes.test.js
 */

const path = require('path')
const express = require('express')

// Must be set BEFORE the router is required — it reads these at module load.
process.env.JWT_SECRET = 'test-secret-for-auth-routes'
delete process.env.ADMIN_EMAIL
delete process.env.ADMIN_PASSWORD

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

// ── In-memory Supabase stand-in ───────────────────────────────────────────────
// Chainable and thenable, because auth.js both `await`s a chain directly
// (update().eq()) and terminates others with .single().

let rows = []

class FakeQuery {
	constructor(store) {
		this.store = store
		this.filters = []
		this.op = null
		this.payload = null
	}
	select() { if (!this.op) this.op = 'select'; return this }
	eq(col, val) { this.filters.push([col, val]); return this }
	limit() { return this }
	insert(records) { this.op = 'insert'; this.payload = records; return this }
	update(patch) { this.op = 'update'; this.payload = patch; return this }

	_match() {
		return this.store.filter((r) => this.filters.every(([c, v]) => r[c] === v))
	}

	async single() {
		if (this.op === 'insert') {
			const record = Object.assign({ id: 'id-' + (this.store.length + 1) }, this.payload[0])
			this.store.push(record)
			return { data: record, error: null }
		}
		const matched = this._match()
		if (matched.length !== 1) return { data: null, error: { message: 'no rows' } }
		return { data: matched[0], error: null }
	}

	then(resolve, reject) {
		let result
		if (this.op === 'update') {
			const matched = this._match()
			matched.forEach((r) => Object.assign(r, this.payload))
			result = { data: matched, error: null }
		} else {
			result = { data: this._match(), error: null }
		}
		return Promise.resolve(result).then(resolve, reject)
	}
}

const fakeSupabase = { from: () => new FakeQuery(rows) }

const supabasePath = require.resolve(path.join(__dirname, '..', 'supabase.js'))
require.cache[supabasePath] = { id: supabasePath, filename: supabasePath, loaded: true, exports: fakeSupabase }

// ── Boot the real router ──────────────────────────────────────────────────────

const { sign } = require('../lib/jwt')
const password = require('../lib/password')
const authRouter = require('../routes/auth/auth')

const SECRET = process.env.JWT_SECRET

const app = express()
app.use(express.json())
app.use('/api/auth', authRouter)

async function main() {
	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	async function call(method, path, { body, token, query } = {}) {
		const headers = { 'Content-Type': 'application/json' }
		if (token) headers.Authorization = 'Bearer ' + token
		const res = await fetch(base + path + (query || ''), {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
		})
		const json = await res.json().catch(() => ({}))
		return { status: res.status, json }
	}

	console.log('\n=== OBA Core — Auth Route Test ===\n')

	// ── The endpoint that allowed account takeover is gone ──────────────────
	// Seed a real, findable account first. Against the old handler this exact
	// request returned 200 and overwrote that account's hash, so the assertions
	// below fail loudly if anything ever reintroduces it. Status alone would be
	// a weak check — the old handler also answered 404, for "no account found" —
	// hence asserting Express's routing 404 (no JSON error body) and, above all,
	// that the stored hash is untouched.
	console.log('The removed reset-password endpoint:')
	{
		rows = [{
			id: 'u-victim',
			email: 'victim@example.com',
			role: 'member',
			org: 'test-org',
			password_hash: password.hash('victim-password'),
		}]
		const r = await call('POST', '/api/auth/reset-password', {
			body: { email: 'victim@example.com', password: 'attacker-chosen' },
		})
		check('POST /reset-password is unrouted', r.status === 404, r.status)
		check('...and answers with no handler body', r.json.error === undefined, r.json)
		check('...leaving the targeted account untouched', password.verify('victim-password', rows[0].password_hash))
		check('...and not set to the attacker value', !password.verify('attacker-chosen', rows[0].password_hash))
	}

	// ── Public registration is closed (D-13) ────────────────────────────────
	// Replaced by backend/tools/provision-user.js — an admin creates accounts
	// directly now, the same way the old reset-password endpoint was replaced
	// by an authenticated change-password flow rather than patched in place.
	console.log('\nThe closed registration endpoint:')
	{
		rows = []
		const r = await call('POST', '/api/auth/register', {
			body: { email: 'climber@example.com', password: 'correct-horse', name: 'C' },
		})
		check('POST /register is unrouted', r.status === 404, r.status)
		check('...and answers with no handler body', r.json.error === undefined, r.json)
		check('...and no account was created', rows.length === 0, rows)
	}

	// ── change-password requires a token ────────────────────────────────────
	console.log('\nchange-password authentication:')
	{
		const r = await call('POST', '/api/auth/change-password', {
			body: { currentPassword: 'a-password-here', newPassword: 'another-one-x' },
		})
		check('rejects an unauthenticated caller', r.status === 401, r.status)
	}

	// Seed a known user to act as.
	rows = [{
		id: 'u-1',
		email: 'owner@example.com',
		name: 'Owner',
		role: 'member',
		org: 'test-org',
		password_hash: password.hash('original-password'),
	}]
	const ownerToken = sign({ sub: 'u-1', email: 'owner@example.com', role: 'member', org: 'test-org' }, SECRET, 300)

	{
		const r = await call('POST', '/api/auth/change-password', {
			query: '?token=' + encodeURIComponent(ownerToken),
			body: { currentPassword: 'original-password', newPassword: 'brand-new-password' },
		})
		check('a ?token= query string does not authenticate', r.status === 401, r.status)
		check('the query-string attempt changed nothing', password.verify('original-password', rows[0].password_hash))
	}

	// ── change-password validation ──────────────────────────────────────────
	console.log('\nchange-password validation:')
	{
		const r = await call('POST', '/api/auth/change-password', { token: ownerToken, body: { newPassword: 'brand-new-password' } })
		check('rejects a missing currentPassword', r.status === 400, r.status)
	}
	{
		const r = await call('POST', '/api/auth/change-password', {
			token: ownerToken,
			body: { currentPassword: 'original-password', newPassword: 'short' },
		})
		check('rejects a new password under the minimum', r.status === 400, r.status)
	}
	{
		const r = await call('POST', '/api/auth/change-password', {
			token: ownerToken,
			body: { currentPassword: 'original-password', newPassword: 'original-password' },
		})
		check('rejects reusing the current password', r.status === 400, r.status)
	}
	{
		const r = await call('POST', '/api/auth/change-password', {
			token: ownerToken,
			body: { currentPassword: 'not-the-real-one', newPassword: 'brand-new-password' },
		})
		check('rejects an incorrect current password', r.status === 401, r.status)
		check('a failed attempt leaves the stored hash alone', password.verify('original-password', rows[0].password_hash))
	}

	// ── The victim-selection parameter is gone ──────────────────────────────
	console.log('\nThe closed takeover path:')
	{
		rows.push({
			id: 'u-2',
			email: 'victim@example.com',
			role: 'member',
			org: 'test-org',
			password_hash: password.hash('victim-password'),
		})
		// The old shape of the attack: name someone else in the body. The handler
		// reads req.user.email and never req.body.email, so this can only ever
		// affect the caller's own account.
		const r = await call('POST', '/api/auth/change-password', {
			token: ownerToken,
			body: { email: 'victim@example.com', currentPassword: 'original-password', newPassword: 'attacker-chosen-1' },
		})
		check('naming another account in the body is accepted but ignored', r.status === 200, r.json)
		check("the named victim's password is untouched", password.verify('victim-password', rows[1].password_hash))
		check("the caller's own password is what changed", password.verify('attacker-chosen-1', rows[0].password_hash))
	}

	// ── Success revokes the token that authorised the change ────────────────
	console.log('\nPost-change token revocation:')
	{
		const r = await call('GET', '/api/auth/me', { token: ownerToken })
		check('the old token is revoked after a successful change', r.status === 401, r.status)
	}

	server.close()

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'AUTH ROUTE TESTS PASSED ✅' : 'AUTH ROUTE TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})

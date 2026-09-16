/*
 * OBA Core — Security Headers Test (SEC-1).
 *
 * Mounts middleware/securityHeaders.js on a throwaway express app, makes a
 * real HTTP request with Node's built-in fetch, and asserts the headers are
 * actually on the wire — not just configured. Offline; no Supabase needed.
 *
 * Run from backend/:  node tests/securityHeaders.test.js
 */

const path = require('path')
const express = require('express')
const securityHeaders = require(path.join(__dirname, '..', 'middleware', 'securityHeaders'))

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

async function main() {
	const app = express()
	app.use(securityHeaders)
	app.get('/ok', (req, res) => res.json({ ok: true }))
	app.use((req, res) => res.status(404).json({ error: 'not found' }))

	const server = app.listen(0)
	await new Promise((r) => server.once('listening', r))
	const base = 'http://127.0.0.1:' + server.address().port

	try {
		for (const [label, p, status] of [['200 response', '/ok', 200], ['404 response', '/missing', 404]]) {
			console.log('\n' + label + ':')
			const res = await fetch(base + p)
			const h = res.headers
			check('status is ' + status, res.status === status, res.status)
			check('X-Content-Type-Options: nosniff', h.get('x-content-type-options') === 'nosniff', h.get('x-content-type-options'))
			check('X-Frame-Options: SAMEORIGIN', h.get('x-frame-options') === 'SAMEORIGIN', h.get('x-frame-options'))
			check('Strict-Transport-Security has max-age', /max-age=\d+/.test(h.get('strict-transport-security') || ''), h.get('strict-transport-security'))
			check('Content-Security-Policy is set', !!h.get('content-security-policy'), h.get('content-security-policy'))
			check('X-Powered-By is removed', h.get('x-powered-by') === null, h.get('x-powered-by'))
		}
	} finally {
		server.close()
	}

	console.log('\n----------------------------------------')
	console.log(`passed: ${passed}   failed: ${failed}`)
	console.log(failed === 0 ? 'SECURITY HEADERS TESTS PASSED ✅' : 'SECURITY HEADERS TESTS FAILED ❌')
	console.log('----------------------------------------')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })

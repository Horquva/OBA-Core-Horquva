/*
 * OBA Core — Live API Smoke Test (MVP)
 * Checks basic authenticated endpoints against the deployed Vercel URL or a
 * local server. Node 18+ (built-in fetch). Run:
 *   BASE_URL=https://horquva-oba-core.vercel.app node tests/api.smoke.test.js
 *   (local: BASE_URL=http://localhost:3000 node tests/api.smoke.test.js)
 * Needs ADMIN_EMAIL/ADMIN_PASSWORD set in the environment it runs against.
 *
 * D-40: this file used to check 3 /api/brain/* paths that never existed (the
 * brain is a library, not a service -- see backend/brain/README.md) and its
 * one real check never sent an Authorization header against a codebase where
 * every route sits behind the global requireAuth gate -- it could not have
 * passed a single one of its 4 checks in its previous form. Logs in first now,
 * and checks real, meaningful endpoints.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

let passed = 0
let failed = 0
let token = null

async function checkEndpoint(path, validate) {
	try {
		const res = await fetch(BASE_URL + path, {
			headers: token ? { Authorization: 'Bearer ' + token } : {},
		})
		const ok = res.ok
		let body = null
		try { body = await res.json() } catch (_) {}
		const valid = ok && (validate ? validate(body) : true)
		if (valid) {
			passed++
			console.log('  ✓', path, '->', res.status)
		} else {
			failed++
			console.error('  ✗', path, '->', res.status)
		}
	} catch (e) {
		failed++
		console.error('  ✗', path, '->', e.message)
	}
}

;(async () => {
	console.log('\n=== OBA Core — API Smoke Test ===')
	console.log('Base URL:', BASE_URL, '\n')

	const adminEmail = process.env.ADMIN_EMAIL
	const adminPassword = process.env.ADMIN_PASSWORD
	if (!adminEmail || !adminPassword) {
		console.error('ADMIN_EMAIL/ADMIN_PASSWORD not set -- cannot authenticate, skipping smoke test.')
		process.exit(0)
	}

	try {
		const res = await fetch(BASE_URL + '/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: adminEmail, password: adminPassword }),
		})
		const body = await res.json()
		if (!res.ok || !body.token) {
			console.error('  ✗ login failed:', body.error || res.status)
			process.exit(1)
		}
		token = body.token
		console.log('  ✓ authenticated as', adminEmail, '\n')
	} catch (e) {
		console.error('  ✗ login request failed:', e.message)
		process.exit(1)
	}

	await checkEndpoint('/api/health/summary')
	await checkEndpoint('/api/intelligence/graph/status', (b) => b && typeof b.isReady === 'boolean')
	await checkEndpoint('/api/dashboard')

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()

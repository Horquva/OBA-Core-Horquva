/*
 * OBA Core — Live API Smoke Test (MVP)
 * Checks basic endpoints against the deployed Vercel URL or a local server.
 * Node 18+ (built-in fetch). Run:
 *   BASE_URL=https://horquva-oba-core.vercel.app node tests/api.smoke.test.js
 *   (local: BASE_URL=http://localhost:3000 node tests/api.smoke.test.js)
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

let passed = 0
let failed = 0

async function checkEndpoint(path, validate) {
	try {
		const res = await fetch(BASE_URL + path)
		const ok = res.ok
		let body = null
		try { body = await res.json() } catch (_) {}
		const valid = ok && (validate ? validate(body) : true)
		if (valid) {
			passed++
			console.log('  \u2713', path, '->', res.status)
		} else {
			failed++
			console.error('  \u2717', path, '->', res.status)
		}
	} catch (e) {
		failed++
		console.error('  \u2717', path, '->', e.message)
	}
}

;(async () => {
	console.log('\n=== OBA Core \u2014 API Smoke Test ===')
	console.log('Base URL:', BASE_URL, '\n')

	await checkEndpoint('/api/brain/boot-report', (b) => b && b.accepted === true && b.modules && b.modules.discovered === 55)
	await checkEndpoint('/api/brain/status')
	await checkEndpoint('/api/brain/registry/modules')
	await checkEndpoint('/api/health/summary')

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()

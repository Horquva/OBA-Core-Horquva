const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

// Always load backend/.env regardless of the current working directory
// (so `node backend/index.js` from the repo root works too).
require('dotenv').config({ path: path.join(__dirname, '.env') })

// The client is constructed on first use, not at import.
//
// createClient() throws "supabaseUrl is required" when SUPABASE_URL is unset,
// and 43 route files plus lib/ownerBackups.js and brain/knowledge/graphLoader.js
// require this module at the top level. So a missing env var did not fail at the
// point of use — it took down the entire require chain of anything that touched
// a route, including test suites whose own headers say they need no database and
// run purely against tests/fixtures/graph.js. That is why CI could never be green
// without real credentials.
//
// domain/index.js already worked around this locally with a try/catch require.
// Doing it here fixes it for every consumer at once, and means the next route
// added to routes/ cannot reintroduce the problem.
//
// The export is a Proxy rather than a getSupabase() function so that all ~200
// existing `supabase.from(...)` call sites keep working unmodified. Every use in
// the codebase is a property access on this object, so the get trap covers them
// all; nothing destructures at import, and nothing uses realtime/auth/storage.

let client = null

function getClient() {
	if (!client) {
		client = createClient(
			process.env.SUPABASE_URL,
			process.env.SUPABASE_KEY,
			{
				realtime: {
					transport: ws,
				},
			}
		)
	}
	return client
}

module.exports = new Proxy(
	{},
	{
		get(_target, prop, receiver) {
			// Escape hatches, answered without constructing anything.
			if (prop === '__getClient') return getClient
			if (prop === '__isConfigured') {
				return () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
			}
			// Let promise-detection and printing work on the module itself without
			// constructing a client: `await require('../supabase')` and console.log
			// of the export should not trigger a connection or a throw.
			if (prop === 'then' || prop === 'inspect' || prop === Symbol.toStringTag) {
				return undefined
			}
			const value = Reflect.get(getClient(), prop, receiver)
			// Methods must stay bound to the real client, or `supabase.from(...)`
			// would execute with the Proxy as `this`.
			return typeof value === 'function' ? value.bind(getClient()) : value
		},

		set(_target, prop, value) {
			getClient()[prop] = value
			return true
		},

		has(_target, prop) {
			return prop in getClient()
		},

		ownKeys() {
			return Reflect.ownKeys(getClient())
		},

		getOwnPropertyDescriptor(_target, prop) {
			const descriptor = Reflect.getOwnPropertyDescriptor(getClient(), prop)
			// A Proxy may only report a property as non-configurable if the target
			// has it too, and the target here is an empty object.
			return descriptor ? { ...descriptor, configurable: true } : undefined
		},
	}
)

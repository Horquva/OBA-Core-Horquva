/*
 * OBA Core — provider selection (W-L 10.7).
 *
 * Adding a provider is a new file in this directory plus AGENT_PROVIDER.
 * It is never a change to the agent loop. See implementation plan §8.4.
 */

const providers = {
	gemini: () => require('./gemini'),
	// anthropic: () => require('./anthropic'),   // Phase 4
}

function getProvider(name) {
	const key = name || process.env.AGENT_PROVIDER || 'gemini'
	const load = providers[key]
	if (!load) throw new Error('Unknown AGENT_PROVIDER: ' + key)
	return load()
}

/* The route mount guard (11.6) calls this. A missing key means the routes do
 * not exist at all, which is a cleaner failure than a 500 (§14). */
function isConfigured(name) {
	const key = name || process.env.AGENT_PROVIDER || 'gemini'
	if (key === 'gemini') return Boolean(process.env.GEMINI_API_KEY && process.env.AGENT_MODEL)
	return false
}

module.exports = { getProvider, isConfigured }

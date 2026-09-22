/*
 * OBA Core — Gemini provider adapter (W-L 10.7).
 *
 * THIS IS THE ONLY FILE IN THE REPOSITORY PERMITTED TO IMPORT @google/genai.
 * Invariant I-7. The agent loop knows the §8.4 interface and nothing else,
 * which is what keeps the free-versus-paid decision reversible.
 *
 * Emits exactly four event shapes:
 *   { type: 'text',      text }
 *   { type: 'tool_call', id, name, args, raw }
 *   { type: 'done',      usage: { inputTokens, outputTokens }, finishReason }
 *   { type: 'error',     error, retryable }
 *
 * On `raw`: Gemini 3 attaches an encrypted `thoughtSignature` to functionCall
 * parts and REJECTS the following request with a 400 if it is not echoed back
 * verbatim. Rebuilding the part from { name, args } silently drops it. So the
 * original vendor part rides along on the event as `raw`, and appendModelTurn
 * prefers it. `raw` is opaque: the loop must never read inside it, and another
 * provider is free to leave it undefined.
 *
 * The SDK is required lazily on purpose: this module must load, and must be
 * unit-testable against an injected fake, when neither the package nor the
 * key is present. 10.1 owns the dependency.
 */

let _client = null

function client() {
	if (!_client) {
		const { GoogleGenAI } = require('@google/genai')
		if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set')
		_client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
	}
	return _client
}

/* Test seams. Never called by production code. */
function __setClient(fake) { _client = fake }
function __resetClient() { _client = null }

function toDeclaration(tool) {
	return { name: tool.name, description: tool.description, parameters: tool.parameters }
}

function mapUsage(u) {
	if (!u) return null
	return {
		inputTokens: u.promptTokenCount || 0,
		outputTokens: u.candidatesTokenCount || 0,
	}
}

/* Retryable means the loop may try once more (§14).
 * 429 is deliberately NOT retryable: requests-per-day is the binding
 * constraint on the free tier and a retry spends another one. */
function isRetryable(err) {
	if (err && err.name === 'AbortError') return false
	const status = (err && (err.status || err.code)) || (err && err.response && err.response.status)
	if (status === 429) return false
	if (typeof status === 'number' && status >= 500 && status < 600) return true
	if (typeof status === 'number' && status >= 400 && status < 500) return false
	return true
}

async function* stream({ systemInstruction, history, tools, signal }) {
	let seq = 0
	try {
		const res = await client().models.generateContentStream({
			model: process.env.AGENT_MODEL,
			contents: history,
			config: {
				systemInstruction,
				tools: [{ functionDeclarations: (tools || []).map(toDeclaration) }],
				abortSignal: signal,
			},
		})

		let usage = null
		let finishReason = null

		for await (const chunk of res) {
			if (signal && signal.aborted) return

			const cand = chunk.candidates && chunk.candidates[0]
			const parts = (cand && cand.content && cand.content.parts) || []

			for (const part of parts) {
				if (part.text) {
					yield { type: 'text', text: part.text }
				}
				if (part.functionCall) {
					yield {
						type: 'tool_call',
						id: part.functionCall.id || part.functionCall.name + '-' + (++seq),
						name: part.functionCall.name,
						args: part.functionCall.args || {},
						raw: part,        // carries thoughtSignature; opaque to the loop
					}
				}
			}

			if (chunk.usageMetadata) usage = mapUsage(chunk.usageMetadata)
			if (cand && cand.finishReason) finishReason = cand.finishReason
		}

		if (signal && signal.aborted) return
		yield { type: 'done', usage, finishReason }
	} catch (err) {
		if ((signal && signal.aborted) || (err && err.name === 'AbortError')) return
		yield { type: 'error', error: err, retryable: isRetryable(err) }
	}
}

/* Append the model's own turn in this provider's wire shape.
 * Accepts the tool_call events the loop already holds, and prefers each
 * event's untouched vendor part so the thought signature survives. */
function appendModelTurn(history, parts) {
	const wire = (parts || []).map(p => {
		if (p && p.type === 'tool_call') {
			return p.raw || { functionCall: { name: p.name, args: p.args } }
		}
		return p
	})
	history.push({ role: 'model', parts: wire })
	return history
}

/* Append a tool result. `result` is the registry envelope (§11.1), unmodified. */
function appendToolResult(history, { id, name, result }) {
	history.push({ role: 'user', parts: [{ functionResponse: { name, response: result } }] })
	return history
}

function describe() {
	return { provider: 'gemini', model: process.env.AGENT_MODEL }
}

module.exports = {
	stream,
	appendToolResult,
	appendModelTurn,
	describe,
	__setClient,
	__resetClient,
}

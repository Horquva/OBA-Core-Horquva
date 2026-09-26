/*
 * OBA Core — Numeric citation validator (part of task W-L 11.8).
 *
 * "Walk every tool result from the turn, collecting all numeric
 *  literals — including numbers inside strings — into an allowed set,
 *  and record the longest array length returned. Extract numeric
 *  tokens from the assistant's final text. A number passes if it is in
 *  the allowed set; within 0.5 of a member, for rounding; an integer
 *  no greater than the longest array length; a four-digit year present
 *  in the results; or inside a quoted entity name. Anything else is a
 *  violation." (implementation plan §11.8 / design spec, Layer 3)
 *
 * Reads toolTrace[i].result.data — the full envelope Maaz's loop now
 * carries alongside `summary` (commit 50e21b0). Does NOT touch
 * toolTrace[i].summary; that field is for the "how I got this" trace,
 * not for grounding numbers.
 */

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function collectNumbers(value, out) {
	if (typeof value === 'number' && Number.isFinite(value)) {
		out.push(value)
		return
	}
	if (typeof value === 'string') {
		const matches = value.match(/-?\d+(\.\d+)?/g)
		if (matches) for (const m of matches) out.push(Number(m))
		return
	}
	if (Array.isArray(value)) {
		for (const item of value) collectNumbers(item, out)
		return
	}
	if (value && typeof value === 'object') {
		for (const key of Object.keys(value)) collectNumbers(value[key], out)
	}
}

function longestArrayLength(value, best) {
	if (Array.isArray(value)) {
		best.n = Math.max(best.n, value.length)
		for (const item of value) longestArrayLength(item, best)
		return
	}
	if (value && typeof value === 'object') {
		for (const key of Object.keys(value)) longestArrayLength(value[key], best)
	}
}

function quotedSpans(text) {
	const spans = []
	const re = /"([^"]*)"|'([^']*)'/g
	let m
	while ((m = re.exec(text))) spans.push([m.index, m.index + m[0].length])
	return spans
}

function isInsideAnySpan(index, spans) {
	return spans.some(([start, end]) => index >= start && index < end)
}

// ---------------------------------------------------------------------
// Numeric citation validator
// ---------------------------------------------------------------------

/**
 * @param {string} text        the assistant's final answer text
 * @param {Array}  toolTrace   the turn's toolTrace, each entry carrying
 *                             `result.data` (full envelope, per 50e21b0)
 * @returns {{ status: 'clean'|'flagged', violations: Array<{value:number, index:number}> }}
 */
function validateNumericCitations(text, toolTrace) {
	const resultDatas = (toolTrace || []).map((entry) => entry?.result?.data ?? null)

	const allowed = []
	collectNumbers(resultDatas, allowed)

	const arrayLen = { n: 0 }
	longestArrayLength(resultDatas, arrayLen)

	const yearsInResults = new Set(allowed.filter((n) => n >= 1000 && n <= 9999 && Number.isInteger(n)))

	const quoted = quotedSpans(text)
	const violations = []

	const numberRe = /-?\d+(\.\d+)?/g
	let m
	while ((m = numberRe.exec(text))) {
		const value = Number(m[0])
		const index = m.index

		if (isInsideAnySpan(index, quoted)) continue

		const exactMatch = allowed.some((a) => a === value)
		const closeMatch = allowed.some((a) => Math.abs(a - value) <= 0.5)
		const validOrdinalOrCount = Number.isInteger(value) && value >= 0 && value <= arrayLen.n
		const validYear = yearsInResults.has(value)

		if (!exactMatch && !closeMatch && !validOrdinalOrCount && !validYear) {
			violations.push({ value, index })
		}
	}

	return {
		status: violations.length === 0 ? 'clean' : 'flagged',
		violations,
	}
}

// ---------------------------------------------------------------------
// D-73: one automatic repair round
// ---------------------------------------------------------------------

/**
 * "On violation, one automatic repair round: re-prompt with the specific
 *  unverified figures named, asking for a corrected answer using only
 *  cited values. If the second attempt still fails, return the answer
 *  annotated as containing unverified figures and record
 *  validator_status = 'flagged'." (implementation plan §11.8, D-73)
 *
 * This existed only as validateNumericCitations()'s pass/fail check —
 * the repair round itself was never built. It needs the provider and the
 * turn's own history/systemInstruction (agent/loop.js already holds all
 * three), so it is injected rather than imported, the same testability
 * pattern loop.js and registry.js use.
 *
 * Never retried a second time: one repair round, then annotate (D-73's
 * own wording), so this can never turn into a silent extra provider call
 * loop — and on the free tier, an uncapped retry would burn quota fast.
 *
 * @param {object} params
 * @param {string} params.text          the assistant's final answer text
 * @param {Array}  params.toolTrace     the turn's toolTrace (validateNumericCitations' own shape)
 * @param {object} params.provider      §8.4 provider adapter (stream())
 * @param {Array}  params.history       the turn's provider-shaped history so far
 * @param {string} params.systemInstruction
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<{ text: string, validatorStatus: 'clean'|'repaired'|'flagged', violations?: Array }>}
 */
async function repairNumericCitations({ text, toolTrace, provider, history, systemInstruction, signal }) {
	const first = validateNumericCitations(text, toolTrace)
	if (first.status === 'clean') {
		return { text, validatorStatus: 'clean' }
	}

	const unverified = [...new Set(first.violations.map((v) => v.value))].join(', ')
	const repairPrompt =
		`Your previous answer included these numbers, which do not trace back to any tool result you called: ${unverified}. ` +
		`Give a corrected answer using ONLY the values already returned by your tool calls above — quote them exactly, ` +
		`and say "not measured" for anything you cannot cite to a tool result.`

	const repairHistory = (history || []).slice()
	repairHistory.push({ role: 'user', parts: [{ text: repairPrompt }] })

	let repairedText = ''
	let sawError = false
	for await (const ev of provider.stream({ systemInstruction, history: repairHistory, tools: [], signal })) {
		if (ev.type === 'text') repairedText += ev.text
		else if (ev.type === 'error') { sawError = true; break }
		else if (ev.type === 'done') break
	}

	// A provider failure on the repair attempt is not itself a second
	// violation — annotate the ORIGINAL answer as flagged rather than
	// replacing it with an empty one.
	if (sawError || !repairedText) {
		return { text, validatorStatus: 'flagged', violations: first.violations }
	}

	const second = validateNumericCitations(repairedText, toolTrace)
	if (second.status === 'clean') {
		return { text: repairedText, validatorStatus: 'repaired' }
	}
	return { text: repairedText, validatorStatus: 'flagged', violations: second.violations }
}

module.exports = { validateNumericCitations, repairNumericCitations }
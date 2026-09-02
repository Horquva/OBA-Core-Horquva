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

module.exports = { validateNumericCitations }
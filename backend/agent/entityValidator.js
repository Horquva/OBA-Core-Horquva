/*
 * OBA Core — Entity allowlist validator (part of task W-L 11.8).
 *
 * "Build the allowed set from the frozen bundle — employees, agents,
 *  workflows, platforms, knowledge assets, departments. Flag capitalised
 *  multi-word sequences that look like names and are not in the set.
 *  A warning, not a block." (implementation plan, §11.8)
 */

// Common organizational/English words that legitimately appear
// capitalised in normal sentences and must never be flagged as an
// invented person or entity. Grows only when a real false positive is
// found, per the spec's own warning that "English capitalisation is
// too noisy to block on."
const COMMON_CAPITALIZED_WORDS = new Set([
	'Engineering', 'Department', 'Risk', 'Score', 'Organizational',
	'Intelligence', 'Governance', 'Market', 'Decision', 'Priority',
	'Summary', 'Directory', 'Distribution', 'Health', 'Dashboard',
])

// Sentence-starting determiners strip off the front of a matched phrase
// before comparison — "The Quarterly Close" should match "Quarterly
// Close" in the allowed set, not fail because of the leading "The".
const LEADING_DETERMINERS = new Set(['The', 'This', 'That', 'These', 'Those', 'A', 'An'])

function stripLeadingDeterminers(words) {
	let out = words
	while (out.length > 1 && LEADING_DETERMINERS.has(out[0])) out = out.slice(1)
	return out
}

/**
 * Build the allowed-name set from the frozen roots bundle.
 *
 * Checked against sql/01_schema_migration.sql, since the field names below
 * used to be guessed rather than read from it:
 *   - the real platforms table is `ai_platforms`, not `platforms` — the
 *     old key was always undefined, so every real platform name was
 *     flagged as an invented entity on every turn.
 *   - `knowledge_assets` rows (not `knowledgeAssets`) have no `name`
 *     column at all; the closest thing is `topic`.
 *   - there is no `departments` table. Department is a free-text column
 *     on `employees`/`workflows`, so the allowed set is the distinct
 *     values actually seen there, not a dedicated root array.
 *
 * @param {object} roots  the frozen roots bundle (domain/derived.js's loadRoots())
 * @returns {Set<string>}
 */
function buildAllowedEntitySet(roots) {
	const allowed = new Set()

	const addNames = (list, field = 'name') => {
		for (const item of list || []) {
			if (item && item[field]) allowed.add(item[field])
		}
	}

	addNames(roots?.employees)
	addNames(roots?.agents)
	addNames(roots?.workflows)
	addNames(roots?.ai_platforms)
	addNames(roots?.knowledge_assets, 'topic')

	for (const emp of roots?.employees || []) {
		if (emp && emp.department) allowed.add(emp.department)
	}
	for (const wf of roots?.workflows || []) {
		if (wf && wf.department) allowed.add(wf.department)
	}

	return allowed
}

// Matches runs of two or more capitalised words — the shape a real
// person's name or a made-up one would both take.
function capitalizedSequences(text) {
	const re = /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)+)\b/g
	const found = []
	let m
	while ((m = re.exec(text))) found.push(m[1])
	return found
}

/**
 * Flag capitalised name-shaped phrases in the answer that are not in
 * the allowed set. A warning, not a block — spec is explicit that this
 * must never hard-fail the turn.
 *
 * @param {string} text
 * @param {Set<string>} allowedSet
 * @returns {{ status: 'clean'|'flagged', violations: string[] }}
 */
function validateEntityAllowlist(text, allowedSet) {
	const candidates = capitalizedSequences(text)
	const violations = []

	for (const phrase of candidates) {
		const words = stripLeadingDeterminers(phrase.split(/\s+/))
		const stripped = words.join(' ')

		if (allowedSet.has(stripped)) continue

		const allCommon = words.every((w) => COMMON_CAPITALIZED_WORDS.has(w))
		if (allCommon) continue

		violations.push(stripped)
	}

	return {
		status: violations.length === 0 ? 'clean' : 'flagged',
		violations,
	}
}

module.exports = { buildAllowedEntitySet, validateEntityAllowlist }
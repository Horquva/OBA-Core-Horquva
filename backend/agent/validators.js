/*
 * OBA Core — Agent validators (task W-L 11.8), entry point.
 *
 * The spec names one file, `backend/agent/validators.js`. Implementation
 * is split for clarity:
 *   - entityValidator.js   the entity allowlist validator
 *   - numericValidator.js  the numeric citation validator — reads
 *                          toolTrace[i].result.data, available since
 *                          Maaz's 50e21b0
 *
 * This file re-exports both under the single path the rest of the
 * codebase imports from.
 */

const { buildAllowedEntitySet, validateEntityAllowlist } = require('./entityValidator')
const { validateNumericCitations } = require('./numericValidator')

module.exports = {
	buildAllowedEntitySet,
	validateEntityAllowlist,
	validateNumericCitations,
}
/**
 * OBA Core — Canonical definitions.
 *
 * One place where "how critical is this", "how critical is this link" and
 * "is this a single point of failure" are defined. Before this module those
 * three questions were answered independently in roughly twenty route files,
 * the brain, and the derived layer — and they disagreed. The brain treated
 * 'high' as the critical set and excluded 'critical' entirely; route loaders
 * defaulted an absent value to 'low' and collapsed several values by keeping
 * whichever row the database happened to return last.
 *
 * Everything here is PURE. No database, no async, no I/O. Callers load rows
 * and pass them in. That is deliberate: derived.js loads every root table once
 * per request and must keep doing so, and a definitions module that issued its
 * own queries would both break that guarantee and be untestable without a
 * database.
 *
 * The `unknown` level is the load-bearing idea. Absent criticality is not
 * `normal` and not `low` — it is unmeasured, and it never satisfies a
 * threshold. A default here would silently manufacture findings out of missing
 * data, which is the failure this whole workstream exists to remove.
 *
 * See docs/superpowers/specs/2026-08-24-oba-remediation-decision-log.md
 * (decisions D-03, D-06, D-07, D-10).
 */

/** Lowest to highest. Order is meaningful — RANK is derived from it. */
const LEVELS = ['low', 'normal', 'high', 'critical']

const RANK = Object.fromEntries(LEVELS.map((level, i) => [level, i]))

// D-65: two vocabularies share this middle tier under different names.
// `dependencies.dependency_type` uses 'normal'; `agents.risk`, `workflows.risk`,
// and `knowledge_assets.criticality` all use 'medium' instead (46 of 59 total
// seed rows across those three columns) — 'normal' never appears on an entity,
// only on an edge. Without this alias, `normalizeLevel('medium')` fell through
// to UNKNOWN, so every medium-risk agent/workflow/asset silently read as
// "unmeasured" everywhere `atOrAbove`/`entityCriticality` was used — found
// while building D-61, confirmed against real seed data, fixed here rather
// than left to compound into a further consumer.
RANK.medium = RANK.normal

/**
 * Not a level. A sentinel meaning "no signal was recorded for this".
 * It has no rank and never compares true against a threshold.
 */
const UNKNOWN = 'unknown'

/** Coerces whatever the database held into a level, or UNKNOWN. Preserves
 *  the caller's own spelling ('medium' stays 'medium', 'normal' stays
 *  'normal') rather than collapsing aliases to one canonical word — only
 *  their RANK, not their label, is shared. */
function normalizeLevel(raw) {
	if (typeof raw !== 'string') return UNKNOWN
	const v = raw.trim().toLowerCase()
	return Object.prototype.hasOwnProperty.call(RANK, v) ? v : UNKNOWN
}

/**
 * True when `level` is at least as critical as `threshold`.
 *
 * Both arguments are normalized first, so callers may pass raw column values.
 * UNKNOWN on either side yields false — an unmeasured thing is never proven to
 * meet a bar, and an unmeasured bar can never be met.
 */
function atOrAbove(level, threshold) {
	const l = normalizeLevel(level)
	const t = normalizeLevel(threshold)
	if (l === UNKNOWN || t === UNKNOWN) return false
	return RANK[l] >= RANK[t]
}

/** Highest known level in the list; UNKNOWN when nothing is known. */
function maxLevel(levels) {
	let best = UNKNOWN
	for (const raw of levels || []) {
		const l = normalizeLevel(raw)
		if (l === UNKNOWN) continue
		if (best === UNKNOWN || RANK[l] > RANK[best]) best = l
	}
	return best
}


/**
 * Which column actually carries the criticality signal, per entity type.
 *
 * These are three different column names for one concept, which is why every
 * consumer that hardcoded one of them was wrong for the other two:
 *
 *   agents            -> risk
 *   workflows         -> risk
 *   knowledge_assets  -> criticality
 *   ai_platforms      -> (none; derived -- see entityCriticality)
 *
 * Verified against backend/sql/01_schema_migration.sql.
 */
const ENTITY_CRITICALITY_FIELD = {
	agent: 'risk',
	workflow: 'risk',
	knowledge_asset: 'criticality',
}

/**
 * Criticality of one entity, whatever table it came from.
 *
 * ai_platforms carries no criticality column, so a platform is criticality is
 * the highest criticality among the knowledge assets recorded about it. One
 * critical piece of knowledge about a tool makes the tool critical. That is a
 * judgement, not a measurement, and it is labelled authored wherever it
 * surfaces.
 *
 * A platform with no knowledge assets is UNKNOWN rather than normal. It
 * therefore cannot satisfy the SPOF threshold and reports as not-evaluable
 * instead of not-a-SPOF.
 *
 * @param {string} entityType  agent | workflow | knowledge_asset | platform
 * @param {object} row         the entity row
 * @param {{knowledgeAssets?: Array}} [ctx]  required only for platforms
 */
function entityCriticality(entityType, row, ctx = {}) {
	if (!row) return UNKNOWN

	if (entityType === 'platform') {
		const assets = ctx.knowledgeAssets
		if (!Array.isArray(assets)) return UNKNOWN
		return maxLevel(
			assets
				.filter((a) => a && a.asset_type === 'platform' && a.asset_id === row.id)
				.map((a) => a.criticality),
		)
	}

	const field = ENTITY_CRITICALITY_FIELD[entityType]
	if (!field) return UNKNOWN
	return normalizeLevel(row[field])
}

/**
 * Criticality of a DEPENDENCY EDGE, from dependencies.dependency_type.
 *
 * Deliberately a separate function from entityCriticality. "This link is
 * critical" and "this thing is critical" are different claims that happen to
 * share four words, and collapsing them is how a route ends up filtering the
 * wrong column. The dependencies table has no criticality column.
 */
function edgeCriticality(depRow) {
	if (!depRow) return UNKNOWN
	return normalizeLevel(depRow.dependency_type)
}

/** Criticality at or above which ownership fragility counts as a SPOF (D-06). */
const SPOF_THRESHOLD = 'high'

/**
 * Is this entity a single point of failure?
 *
 * SPOF = sole owner AND no backup owner AND criticality >= high.
 *
 * Dependents are deliberately NOT consulted. A critical asset with nothing
 * currently depending on it is still a single point of failure, because the
 * dependency graph is incomplete and absence of a recorded dependent is not
 * evidence of absence.
 *
 * Four outcomes rather than a boolean:
 *
 *   spof           sole owner, no backup, critical enough
 *   orphaned       NOBODY owns it -- not "sole owner", and a worse finding
 *                  that would be hidden if folded into not_spof
 *   not_evaluable  criticality is unmeasured; we cannot say either way
 *   not_spof       genuinely fine on this axis
 *
 * Takes resolved facts rather than rows so it stays pure and so callers can
 * reuse the backup index derived.js already builds (derived.js:121).
 *
 * @param {{criticality?: string, ownerCount?: number, hasBackup?: boolean}} facts
 * @returns {{status: string, reasons: string[]}}
 */
function spofVerdict({ criticality, ownerCount, hasBackup } = {}) {
	const level = normalizeLevel(criticality)
	const owners = Number(ownerCount) || 0

	if (owners === 0) {
		return { status: 'orphaned', reasons: ['no_owner'] }
	}

	if (level === UNKNOWN) {
		return { status: 'not_evaluable', reasons: ['criticality_unmeasured'] }
	}

	const reasons = []
	if (owners === 1) reasons.push('sole_owner')
	if (!hasBackup) reasons.push('no_backup_owner')
	if (atOrAbove(level, SPOF_THRESHOLD)) reasons.push('criticality_' + level)

	const isSpof = owners === 1 && !hasBackup && atOrAbove(level, SPOF_THRESHOLD)
	return { status: isSpof ? 'spof' : 'not_spof', reasons }
}

/** Share of a population that must carry a field before a score may be computed (D-10). */
const COVERAGE_THRESHOLD = 0.5

/**
 * How much of rows actually carries the signal a score needs.
 *
 * @param {Array} rows
 * @param {(row: any) => boolean} hasField
 */
function coverage(rows, hasField) {
	const list = Array.isArray(rows) ? rows : []
	const total = list.length
	const covered = list.filter((r) => Boolean(hasField(r))).length
	return { covered, total, ratio: total === 0 ? 0 : covered / total }
}

/**
 * Decides whether there is enough evidence to publish a number at all.
 *
 * Below the threshold the caller must return insufficient_evidence and NO
 * value. An EMPTY population is always insufficient -- treating 0 of 0 as
 * fully covered would let an empty database render as a healthy organization.
 *
 * W-C ships this gate and its tests. Surfacing the refusal in the UI is W-E.
 *
 * @param {Array} rows
 * @param {(row: any) => boolean} hasField
 * @param {{threshold?: number}} [opts]
 */
function evidenceGate(rows, hasField, opts = {}) {
	const threshold = typeof opts.threshold === 'number' ? opts.threshold : COVERAGE_THRESHOLD
	const { covered, total, ratio } = coverage(rows, hasField)
	const sufficient = total > 0 && ratio >= threshold
	return {
		sufficient,
		status: sufficient ? 'computed' : 'insufficient_evidence',
		coverage: ratio,
		covered,
		total,
		threshold,
	}
}

/**
 * Combines several evidenceGate() results into one composite: sufficient only
 * if every named gate is. Surfaces the WORST (lowest-coverage) gate's own
 * coverage/covered/total/threshold at the top level — so a composite is still
 * readable by anything that only knows how to read a single evidenceGate()
 * shape (a UI badge, for instance) — while spreading every named gate
 * alongside for detail.
 *
 * @param {{[name: string]: ReturnType<typeof evidenceGate>}} namedGates
 */
function combineEvidence(namedGates) {
	const entries = Object.entries(namedGates)
	const sufficient = entries.every(([, g]) => g.sufficient)
	const worst = entries.reduce((min, [, g]) => (g.coverage < min.coverage ? g : min), entries[0][1])
	return {
		sufficient,
		status: sufficient ? 'computed' : 'insufficient_evidence',
		coverage: worst.coverage,
		covered: worst.covered,
		total: worst.total,
		threshold: worst.threshold,
		...namedGates,
	}
}
module.exports = {
	LEVELS,
	RANK,
	UNKNOWN,
	normalizeLevel,
	atOrAbove,
	maxLevel,
	ENTITY_CRITICALITY_FIELD,
	entityCriticality,
	edgeCriticality,
	SPOF_THRESHOLD,
	spofVerdict,
	COVERAGE_THRESHOLD,
	coverage,
	evidenceGate,
	combineEvidence,
}

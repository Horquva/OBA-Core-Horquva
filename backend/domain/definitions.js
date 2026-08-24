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

/**
 * Not a level. A sentinel meaning "no signal was recorded for this".
 * It has no rank and never compares true against a threshold.
 */
const UNKNOWN = 'unknown'

/** Coerces whatever the database held into a level, or UNKNOWN. */
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
}

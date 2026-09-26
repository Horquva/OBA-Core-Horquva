const supabase = require('../supabase')

let writeFailuresSinceBoot = 0
let pendingFailureCount = 0
let lastFailureAt = null

const CHANGE_FIELDS = {
	'agent.owner_update': ['owner_id'],
	'audit.write_failed': ['failed_writes'],
	'audit.purge': ['deleted'],
}

function safeText(value, max = 256) {
	if (value === undefined || value === null) return null
	return String(value).slice(0, max)
}

function safeChanges(action, changes) {
	if (!changes || typeof changes !== 'object' || Array.isArray(changes)) return null
	const fields = CHANGE_FIELDS[action] || []
	const result = {}
	for (const field of fields) {
		const change = changes[field]
		if (!change || typeof change !== 'object' || Array.isArray(change)) continue
		result[field] = { from: change.from ?? null, to: change.to ?? null }
	}
	return Object.keys(result).length ? result : null
}

function auditRow(req, event) {
	const actor = event.actor === undefined ? (req && req.user) : event.actor
	// Tenant context (Phase 1.2): audit rows carry the org they happened in.
	// Nullable — infra/startup actions and pre-tenant rows stay null.
	let orgId = req && req.orgId
	if (!orgId) {
		try { orgId = require('./tenant').currentOrgId() } catch (_) { /* tenant lib unavailable */ }
	}
	return {
		org_id: orgId ?? null,
		actor_id: actor ? safeText(actor.id ?? actor.sub) : null,
		actor_email: actor ? safeText(actor.email) : null,
		actor_role: actor ? safeText(actor.role) : null,
		action: safeText(event.action),
		outcome: event.outcome,
		reason: safeText(event.reason),
		target_type: safeText(event.targetType),
		target_id: safeText(event.targetId),
		changes: safeChanges(event.action, event.changes),
		http_method: req ? safeText(req.method, 16) : null,
		path: req ? safeText((req.originalUrl || req.url || '').split('?')[0], 2048) : null,
		user_agent: req ? safeText(req.get && req.get('user-agent'), 256) : null,
	}
}

async function insertRow(row) {
	const { error } = await supabase.from('audit_log').insert([row])
	if (error) throw error
}

function flagFailure(action, error) {
	writeFailuresSinceBoot += 1
	pendingFailureCount += 1
	lastFailureAt = new Date().toISOString()
	console.error('[AUDIT] write failed:', action, error && error.message ? error.message : String(error))
}

async function recordAudit(req, event) {
	const row = auditRow(req, event)
	try {
		if (pendingFailureCount > 0) {
			const failedWrites = pendingFailureCount
			await insertRow(auditRow(req, {
				action: 'audit.write_failed',
				outcome: 'failure',
				reason: 'insert_error',
				changes: { failed_writes: { from: null, to: failedWrites } },
				actor: req && req.user,
			}))
			pendingFailureCount = 0
		}
		await insertRow(row)
	} catch (error) {
		flagFailure(event.action, error)
	}
}

function auditHealth() {
	return {
		write_failures_since_boot: writeFailuresSinceBoot,
		last_failure_at: lastFailureAt,
	}
}

module.exports = { recordAudit, auditHealth }
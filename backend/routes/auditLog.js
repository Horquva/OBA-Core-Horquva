const express = require('express')
const router = express.Router()
const supabase = require('../supabase')
const { requireAdmin } = require('../middleware/requireRole')
const { auditHealth } = require('../lib/audit')

const OUTCOMES = new Set(['success', 'failure', 'denied'])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/

function invalid(value, predicate) {
	return value !== undefined && (!value || !predicate(value))
}

router.get('/', requireAdmin, async (req, res) => {
	const query = req.query
	if (invalid(query.outcome, (value) => OUTCOMES.has(value))) {
		return res.status(400).json({ error: 'outcome must be success, failure, or denied' })
	}
	if (invalid(query.from, (value) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)))) {
		return res.status(400).json({ error: 'from must be an ISO timestamp' })
	}
	if (invalid(query.to, (value) => ISO_DATE.test(value) && !Number.isNaN(Date.parse(value)))) {
		return res.status(400).json({ error: 'to must be an ISO timestamp' })
	}

	let limit = query.limit === undefined ? 50 : Number(query.limit)
	if (!Number.isInteger(limit) || limit < 1) return res.status(400).json({ error: 'limit must be a positive integer' })
	limit = Math.min(limit, 200)
	let beforeId
	if (query.before_id !== undefined) {
		beforeId = Number(query.before_id)
		if (!Number.isSafeInteger(beforeId) || beforeId < 1) return res.status(400).json({ error: 'before_id must be a positive integer' })
	}

	try {
		let request = supabase.from('audit_log').select('*').order('id', { ascending: false }).limit(limit)
		for (const [field, value] of [['actor_id', query.actor_id], ['action', query.action], ['target_type', query.target_type], ['target_id', query.target_id]]) {
			if (value !== undefined) request = request.eq(field, value)
		}
		if (query.outcome !== undefined) request = request.eq('outcome', query.outcome)
		if (query.from !== undefined) request = request.gte('occurred_at', query.from)
		if (query.to !== undefined) request = request.lte('occurred_at', query.to)
		if (beforeId !== undefined) request = request.lt('id', beforeId)
		const { data, error } = await request
		if (error) return res.status(500).json({ error: 'Audit log unavailable' })
		const entries = data || []
		return res.json({
			entries,
			next_before_id: entries.length ? entries[entries.length - 1].id : null,
			health: auditHealth(),
		})
	} catch (_) {
		return res.status(500).json({ error: 'Audit log unavailable' })
	}
})

module.exports = router
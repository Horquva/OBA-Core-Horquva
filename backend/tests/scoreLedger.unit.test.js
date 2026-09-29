/*
 * OBA Core — Score & Evidence Ledger tests (Phase 2.3, Spec 1).
 *
 * Pins: the delta guard (unchanged scores are not re-persisted), the
 * evidence refs grounding each O/D/S/U variable in real rows, org-scoped
 * inserts, and the best-effort contract (a ledger failure never throws out
 * of the wrapper). Stubs Supabase in-memory — no database involved.
 *
 * Run from backend/:  node tests/scoreLedger.unit.test.js
 */

const path = require('path')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const tenant = require('../lib/tenant')
const ledger = require('../domain/scoreLedger')

const ORG = '00000000-0000-4000-8000-000000000001'
const AGENT = 'a0000000-0000-4000-8000-000000000001'

const roots = {
	agents: [{ id: AGENT, name: 'DeployBot', status: 'failed', owner_id: 'e0000000-0000-4000-8000-000000000009' }],
	owners: [{ id: 'own-row-1', employee_id: 'e0000000-0000-4000-8000-000000000009', backup_owner: null }],
	knowledge_assets: [{ id: 'ka-1', asset_type: 'agent', asset_id: AGENT, is_documented: false }],
	dependencies: [{ id: 'dep-1', source_type: 'workflow', source_id: 'w1', target_type: 'agent', target_id: AGENT, dependency_type: 'critical' }],
	workflow_failures: [],
}

const scoreResult = {
	scores: [{
		agentId: AGENT,
		agentName: 'DeployBot',
		predictedScore: 92,
		threatLevel: 'CRITICAL',
		evidence: { ownership: 1, documentation: 0, runtime_state: 0, cascade_exposure: 1 },
	}],
}

// ── in-memory supabase ──
let scoreRows = []
let evidenceRows = []
let failInsert = false

function stubSupabase() {
	const p = require.resolve(path.join(__dirname, '..', 'supabase.js'))
	require.cache[p] = {
		id: p, filename: p, loaded: true,
		exports: {
			from: (table) => {
				if (table === 'score_history') {
					return {
						select: () => ({
							eq: () => ({
								order: () => ({
									limit: async () => ({ data: scoreRows.map((r) => ({ entity_id: r.entity_id, score: r.score, threat_level: r.threat_level })), error: null }),
								}),
							}),
							// pattern used by the delta-guard read (no eq)
							order: () => ({
								limit: async () => ({ data: scoreRows.map((r) => ({ entity_id: r.entity_id, score: r.score, threat_level: r.threat_level })), error: null }),
							}),
						}),
						insert: (rows) => ({
							// supabase-js: .insert(rows).select(...) chains and awaits
							select: async () => {
								if (failInsert) return { data: null, error: { message: 'boom' } }
								const firstId = `sh-${scoreRows.length + 1}`
								for (const r of rows) scoreRows.push({ ...r, id: `sh-${scoreRows.length + 1}` })
								return { data: rows.map((r, i) => ({ id: `sh-${Number(firstId.slice(3)) + i}`, entity_id: r.entity_id })), error: null }
							},
						}),
					}
				}
				if (table === 'evidence_records') {
					return {
						insert: async (rows) => { evidenceRows.push(...rows); return { data: rows, error: null } },
					}
				}
				throw new Error('scoreLedger test: unexpected table ' + table)
			},
		},
	}
}

async function main() {
	console.log('\n=== OBA Core — Score & Evidence Ledger tests ===\n')

	console.log('buildEvidenceRefs:')
	{
		const refs = ledger.buildEvidenceRefs(roots, roots.agents[0])
		check('ownership refs the owners row (no backup)', refs.some((r) => r.sourceTable === 'owners' && /NO/.test(r.fact) && r.sourceRowId === 'own-row-1'), refs.filter((r) => r.sourceTable === 'owners'))
		check('unbounded doc reads as undocumented', refs.some((r) => r.sourceTable === 'agents' && /no knowledge assets/.test(r.fact)) === false && refs.some((r) => r.sourceTable === 'knowledge_assets' && /undocumented/.test(r.fact)), refs.filter((r) => r.sourceTable === 'knowledge_assets'))
		check('runtime state refs the agent row', refs.some((r) => r.sourceTable === 'agents' && /runtime status: failed/.test(r.fact)))
		check('cascade exposure refs the incoming dependency edge', refs.some((r) => r.sourceTable === 'dependencies' && r.sourceRowId === 'dep-1'))
		check('unowned agent reads an explicit unowned fact', (() => {
			const unowned = { ...roots.agents[0], owner_id: null }
			const r = ledger.buildEvidenceRefs(roots, unowned)
			return r.some((x) => /unowned — no owner_id/.test(x.fact))
		})())
	}

	console.log('\npersistScoreRun (tenant-scoped):')
	{
		stubSupabase()
		scoreRows = []
		evidenceRows = []
		await tenant.runAsOrg(ORG, async () => {
			const first = await ledger.persistScoreRun(require('../supabase'), roots, scoreResult)
			check('first run persists the score', first.persisted === 1, first)
			check('score row carries org, model version and the O/D/S/U tuple', scoreRows[0].org_id === ORG && scoreRows[0].model_version === ledger.RISK_MODEL_VERSION && scoreRows[0].evidence?.ownership === 1, scoreRows[0])
			check('evidence rows linked to the score row', evidenceRows.length >= 4 && evidenceRows.every((r) => r.score_history_id === 'sh-1' && r.org_id === ORG), evidenceRows.length)

			const second = await ledger.persistScoreRun(require('../supabase'), roots, scoreResult)
			check('delta guard: an unchanged score is not re-persisted', second.persisted === 0 && second.skipped === 'unchanged', second)

			const changed = await ledger.persistScoreRun(require('../supabase'), roots, {
				scores: [{ ...scoreResult.scores[0], predictedScore: 88, threatLevel: 'CRITICAL' }],
			})
			check('a changed score persists again', changed.persisted === 1, changed)
		})
	}
	{
		stubSupabase()
		scoreRows = []
		evidenceRows = []
		const outside = await ledger.persistScoreRun(require('../supabase'), roots, scoreResult)
		check('outside a tenant context persistence is skipped (never unscoped)', outside.skipped === 'no-org-context' && scoreRows.length === 0, outside)
	}

	console.log('\nbest-effort contract:')
	{
		stubSupabase()
		scoreRows = []
		failInsert = true
		await tenant.runAsOrg(ORG, async () => {
			const res = await ledger.persistScoreRunBestEffort(require('../supabase'), roots, scoreResult)
			check('an insert failure is reported, not thrown', res && typeof res.error === 'string', res)
		})
		failInsert = false
	}

	console.log('\n----------------------------------------')
	console.log('passed: ' + passed + '   failed: ' + failed)
	console.log(failed === 0 ? 'SCORE LEDGER TESTS PASSED ✅' : 'SCORE LEDGER TESTS FAILED ❌')
	console.log('----------------------------------------\n')
	process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
	console.error('Test harness error:', err)
	process.exit(1)
})

/*
 * OBA Core — Numeric validator test fixtures.
 * Shaped exactly like the real toolTrace entries after Maaz's 50e21b0 —
 * each entry now carries the full envelope as `result`, alongside the
 * short `summary` string. See #11.8 thread: "result.data has the
 * numbers, and result.provenance / result.evidence are there too."
 */

const toolTraceSingleEntity = [
	{
		id: 'call-1',
		name: 'get_entity_profile',
		args: { id: 'emp-42' },
		summary: 'name, department, predictedRisk, dependentCount',
		durationMs: 120,
		result: {
			data: {
				id: 'emp-42',
				name: 'Sarah Mitchell',
				department: 'Engineering',
				predictedRisk: 0.82,
				dependentCount: 5,
			},
			provenance: { computedAt: '2026-09-01T10:00:00Z', snapshotAt: '2026-09-01T10:00:00Z', source: 'live', inputs: { id: 'emp-42' } },
			evidence: { status: 'computed', coverage: 1, covered: 5, total: 5 },
			notes: [],
		},
	},
]

const toolTraceOrgSnapshot = [
	{
		id: 'call-2',
		name: 'get_org_snapshot',
		args: {},
		summary: 'orgScore, governanceIntelligence, marketIntelligence, decisionIntelligence',
		durationMs: 95,
		result: {
			data: {
				orgScore: 62,
				governanceIntelligence: 58,
				marketIntelligence: 55,
				decisionIntelligence: 68,
				asOf: '2026-09-01',
			},
			provenance: { computedAt: '2026-09-01T10:00:00Z', snapshotAt: '2026-09-01T10:00:00Z', source: 'live', inputs: {} },
			evidence: null,
			notes: ['Pillar weights are authored, not measured (D-11).'],
		},
	},
]

const toolTraceRankedList = [
	{
		id: 'call-3',
		name: 'rank_scenarios',
		args: { scenarios: ['DeployBot', 'KnowledgeIndexer', 'ContentGenerator'] },
		summary: '3 item(s)',
		durationMs: 200,
		result: {
			data: {
				ranked: [
					{ name: 'DeployBot', risk: 82 },
					{ name: 'KnowledgeIndexer', risk: 90 },
					{ name: 'ContentGenerator', risk: 25 },
				],
			},
			provenance: { computedAt: '2026-09-01T10:00:00Z', snapshotAt: '2026-09-01T10:00:00Z', source: 'live', inputs: {} },
			evidence: { status: 'computed', coverage: 1, covered: 3, total: 3 },
			notes: [],
		},
	},
]

module.exports = { toolTraceSingleEntity, toolTraceOrgSnapshot, toolTraceRankedList }
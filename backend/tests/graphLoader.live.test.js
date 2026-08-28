/*
 * OBA Core — Graph Loader live test (MVP)
 * No external test framework. REQUIRES Supabase credentials in backend/.env —
 * skipped automatically when SUPABASE_URL is absent, the same way
 * api.smoke.test.js skips without BASE_URL.
 * Run from the backend/ folder:  node tests/graphLoader.live.test.js
 *
 * Guards three defects found on 2026-08-24, each of which was visible on the
 * Org Science page as a confident number rather than as missing data:
 *   1. `organization` and the six `department` entities were created and then
 *      never connected, so M37/M29/M45 reported them as isolated anomalies.
 *   2. `collaborates_with` was never emitted, so M42 called all 40 people
 *      siloed — a wrong answer, not a missing one (BUILD_SPEC Part 0).
 *   3. `owns` edges carried no provenance, leaving D1 nothing to rank on.
 */

require('../supabase') // loads backend/.env

let passed = 0
let failed = 0

function check(name, condition) {
	if (condition) {
		passed++
		console.log('  ✓', name)
	} else {
		failed++
		console.error('  ✗', name)
	}
}

;(async () => {
	console.log('\n=== OBA Core — Graph Loader Live Test ===\n')

	if (!process.env.SUPABASE_URL) {
		console.log('  – skipped: SUPABASE_URL not set\n')
		process.exit(0)
	}

	try {
		const KnowledgeGraph = require('../brain/knowledge/knowledgeGraph')
		const { loadFromSupabase } = require('../brain/knowledge/graphLoader')

		const g = new KnowledgeGraph()
		await loadFromSupabase(g)

		check('graph validates', g.validate().valid === true)

		// ─── 1. structural entities are connected ───
		const degree = (id) => g.relationships.neighbors(id).length
		const structural = g.entities.list('organization').concat(g.entities.list('department'))
		const orphans = structural.filter((e) => degree(e.id) === 0)
		check('organization + departments all exist (7)', structural.length === 7)
		check('no orphaned structural entities', orphans.length === 0)
		if (orphans.length) console.error('    orphans:', orphans.map((e) => e.name).join(', '))

		const deptOwners = g.relationships.list('owns')
			.filter((r) => (g.entities.get(r.to) || {}).type === 'department')
		check('each department has an accountable executive (6)', deptOwners.length === 6)

		// ─── 2. collaboration is derived, not absent ───
		const collab = g.relationships.list('collaborates_with')
		const people = new Set(collab.flatMap((r) => [r.from, r.to]))
		check('collaborates_with edges derived (51)', collab.length === 51)
		check('collaboration covers 24 of 40 people', people.size === 24)
		check('every collaboration edge records its basis',
			collab.every((r) => r.metadata && r.metadata.source === 'derived' && !!r.metadata.basis))
		check('every collaboration edge records a real weight (>=1)',
			collab.every((r) => Number.isInteger(r.metadata.weight) && r.metadata.weight >= 1))
		check('basis vocabulary is raci/workflow_step only (shared deriveCollaborations.js)',
			[...new Set(collab.map((r) => r.metadata.basis))].every((b) => b === 'raci' || b === 'workflow_step'))

		// ─── 3. ownership provenance (BUILD_SPEC D1) ───
		const owns = g.relationships.list('owns')
		const withSource = owns.filter((r) => r.metadata && r.metadata.source)
		check('every owns edge carries metadata.source', owns.length > 0 && withSource.length === owns.length)

		// ─── 4. the projection is not lossy (design step 4) ───
		// graphLoader used to keep a hand-picked four or five columns per entity and
		// drop the rest, which is why cost and adoption questions could not be asked
		// of the graph at all. The whole source row is now carried.
		const anyAgent = g.entities.list('ai_agent').find((e) => e.metadata.kind === 'automation-agent')
		const anyPlatform = g.entities.list('ai_agent').find((e) => e.metadata.kind === 'ai-platform')
		const anyEmployee = g.entities.list('employee')[0]

		check('agents carry cost and usage', !!anyAgent &&
			'cost' in anyAgent.metadata && 'usage_count' in anyAgent.metadata && 'adoption_pct' in anyAgent.metadata,
			anyAgent ? Object.keys(anyAgent.metadata).join(',') : 'no agent')
		check('platforms carry monthly cost and vendor', !!anyPlatform &&
			'cost_monthly' in anyPlatform.metadata && 'vendor' in anyPlatform.metadata,
			anyPlatform ? Object.keys(anyPlatform.metadata).join(',') : 'no platform')
		check('employees carry tenure, skills and workload', !!anyEmployee &&
			'tenure' in anyEmployee.metadata && 'skills' in anyEmployee.metadata && 'workload' in anyEmployee.metadata,
			anyEmployee ? Object.keys(anyEmployee.metadata).join(',') : 'no employee')
		check('timestamps survive the projection', !!anyAgent && 'last_used' in anyAgent.metadata)
		check('every entity records where it came from',
			g.entities.list().filter((e) => e.type !== 'organization' && e.type !== 'department')
				.every((e) => !!e.metadata.sourceTable && e.metadata.sourceId != null))
		check('metadata does not shadow entity identity',
			g.entities.list().every((e) => !('id' in e.metadata) && !('name' in e.metadata)))
		check('metadata.role still readable (the one field analyses use)',
			typeof anyEmployee.metadata.role === 'string', anyEmployee.metadata.role)
		// searchContext stringifies metadata, so richer rows make it find more
		check('search finds a platform by its vendor', g.searchContext('OpenAI').length > 0,
			`${g.searchContext('OpenAI').length} hits`)

		// ─── 5. agent_platform / workflow_tool_dependencies are real depends_on
		// edges, not just display metadata (2026-08-26 audit concern) — cascade,
		// SPOF and centrality all traverse depends_on generically, so a tool
		// dependency that only lived in entity metadata would be invisible to
		// every one of them. ───
		const dependsOn = g.relationships.list('depends_on')
		const platformIds = new Set(
			g.entities.list('ai_agent').filter((e) => e.metadata.kind === 'ai-platform').map((e) => e.id)
		)
		const agentToPlatform = dependsOn.filter((r) => platformIds.has(r.to) && r.metadata && r.metadata.source === 'agent_platform')
		const workflowToPlatform = dependsOn.filter((r) => platformIds.has(r.to) && r.metadata && r.metadata.source === 'workflow_tool_dependencies')
		check('agent_platform rows become real depends_on edges', agentToPlatform.length > 0, agentToPlatform.length)
		check('workflow_tool_dependencies rows become real depends_on edges', workflowToPlatform.length > 0, workflowToPlatform.length)
		check('a platform with an agent dependent is reachable via dependents()',
			agentToPlatform.length > 0 && g.relationships.to(agentToPlatform[0].to).some((r) => r.type === 'depends_on'))

		// ─── 6. systems/processes/external_entities wired from Supabase (2026-08-26) ───
		const systems = g.entities.list('system')
		const processes = g.entities.list('process')
		const vendors = g.entities.list('vendor')
		const customers = g.entities.list('customer')
		check('systems loaded from systems table (4)', systems.length === 4, systems.length)
		check('processes loaded from accountability_entities (2)', processes.length === 2, processes.length)
		check('vendors loaded from external_entities (6)', vendors.length === 6, vendors.length)
		check('customers loaded from external_entities (4)', customers.length === 4, customers.length)
		check('every system/process/vendor/customer entity has provenance',
			[...systems, ...processes, ...vendors, ...customers].every((e) => e.metadata.sourceTable && e.metadata.sourceId != null))

		const systemDeps = dependsOn.filter((r) => r.metadata && r.metadata.source === 'systems')
		check('inter-system depends_on edges exist (Billing/Warehouse/Admin -> Core Platform, Admin -> Billing = 4)',
			systemDeps.length === 4, systemDeps.length)

		const systemUsage = dependsOn.filter((r) => r.metadata && r.metadata.source === 'system_agent_usage')
		check('agent-to-system usage edges exist (12: 5 Core Platform, 1 Billing, 4 CDW, 2 Admin Portal)',
			systemUsage.length === 12, systemUsage.length)

		const systemOwnership = owns.filter((r) => systems.some((s) => s.id === r.to))
		check('every system has an owner', systemOwnership.length === systems.length, systemOwnership.length)

		const produces = g.relationships.list('produces')
		check('at least one vendor produces edge resolves to a real platform (supplies a tracked tool)', produces.length > 0, produces.length)

		// ─── 7. decisions wired from decision_queue (2026-08-26) ───
		const decisions = g.entities.list('decision')
		check('decisions loaded from decision_queue (10)', decisions.length === 10, decisions.length)
		check('every decision entity has provenance',
			decisions.every((e) => e.metadata.sourceTable === 'decision_queue' && e.metadata.sourceId != null))

		const decisionOwnership = owns.filter((r) => decisions.some((d) => d.id === r.to))
		check('every decision has an owner', decisionOwnership.length === decisions.length, decisionOwnership.length)

		const concerns = g.relationships.list('concerns')
		check('every decision concerns a real subject entity (10)', concerns.length === 10, concerns.length)
		check('concerns edges resolve across entity types, not just one kind',
			new Set(concerns.map((r) => g.entities.get(r.to).type)).size > 1,
			[...new Set(concerns.map((r) => g.entities.get(r.to).type))].join(','))

		const expected = new Set(['agents.owner_id', 'tool_ownership', 'workflow_runbooks', 'knowledge_assets', 'employees.department', 'systems', 'accountability_entities', 'external_entities', 'decision_queue'])
		const actual = new Set(owns.map((r) => r.metadata.source))
		check('owns provenance names only real source tables',
			[...actual].every((s) => expected.has(s)))
		if (![...actual].every((s) => expected.has(s))) console.error('    unexpected:', [...actual].filter((s) => !expected.has(s)))
	} catch (e) {
		failed++
		console.error('  ✗ loader threw:', e.message)
	}

	console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
	process.exit(failed === 0 ? 0 : 1)
})()

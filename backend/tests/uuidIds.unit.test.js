/*
 * OBA Core — UUID id-space tests (Phase 1.1, sql/19_uuid_primary_keys.sql).
 *
 * Entity primary keys are uuids now; the guarantee being tested is that the
 * domain layer treats ids as opaque strings everywhere:
 *   - lib/uuid.js validates route params/bodies,
 *   - dependencyIndex()/cascadeReach() key on `type:id` strings,
 *   - riskEngine's kappa lookup resolves uuid-keyed entities (a Number()
 *     coercion here would silently drop every weight to KAPPA.unknown —
 *     that exact regression is what this suite pins).
 *
 * Run from backend/:  node tests/uuidIds.unit.test.js
 */

const { isUuid } = require('../lib/uuid')
const { dependencyIndex, cascadeReach } = require('../domain/derived')
const riskEngine = require('../domain/riskEngine')

let passed = 0
let failed = 0
function check(name, cond, detail) {
	if (cond) { passed++; console.log('  ✓', name) }
	else { failed++; console.error('  ✗', name, detail !== undefined ? '\n      got: ' + JSON.stringify(detail) : '') }
}

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

console.log('\n=== OBA Core — UUID id-space tests ===\n')

console.log('lib/uuid.js:')
check('accepts a canonical uuid', isUuid(U(1)))
check('accepts uppercase uuid', isUuid(U(2).toUpperCase()))
check('rejects a bare integer', !isUuid('42'))
check('rejects a non-uuid string', !isUuid('deploy-bot'))
check('rejects numbers', !isUuid(42))
check('rejects null/undefined', !isUuid(null) && !isUuid(undefined))

console.log('\ndependencyIndex / cascadeReach with uuid ids:')
const deps = [
	{ source_type: 'agent', source_id: U(1), target_type: 'agent', target_id: U(2), dependency_type: 'critical' },
	{ source_type: 'agent', source_id: U(3), target_type: 'agent', target_id: U(2), dependency_type: 'normal' },
	// cross-type edge: workflow 10 depends on agent 2 — must join the same
	// key space now that ids are globally unique
	{ source_type: 'workflow', source_id: U(10), target_type: 'agent', target_id: U(2), dependency_type: 'high' },
	{ source_type: 'agent', source_id: U(1), target_type: 'workflow', target_id: U(20), dependency_type: 'normal' },
]
const index = dependencyIndex({ dependencies: deps })
check('agents depending on a uuid-keyed agent are indexed', (index.dependentsOf.get(`agent:${U(2)}`) || []).length === 3)
check('cross-type dependents appear with their own type', (index.dependentsOf.get(`agent:${U(2)}`) || []).some((d) => d.type === 'workflow'))
check('cascadeReach counts cross-type dependents of agent 2', cascadeReach('agent', U(2), index) === 3)
check('cascadeReach of a workflow counts its agent dependents', cascadeReach('workflow', U(20), index) === 1)
check('cascadeReach of an isolated node is 0', cascadeReach('agent', U(99), index) === 0)

console.log('\nriskEngine kappa lookup with uuid ids:')
const roots = {
	agents: [
		{ id: U(1), risk: 'critical', owner_id: U(7), status: 'active' },
		{ id: U(2), risk: 'low', owner_id: null, status: 'active' },
	],
	workflows: [
		{ id: U(20), risk: 'high', status: 'active' },
	],
	ai_platforms: [
		{ id: U(30), status: 'active' },
	],
	knowledge_assets: [],
	dependencies: deps,
	owners: [],
	workflow_runbooks: [],
	tool_backups: [],
	workflow_failures: [],
	agents_used: undefined,
}
const engine = riskEngine.buildEngine(roots)
check('critical agent kappa resolves (1.0), not KAPPA.unknown (0.4)', engine.kappaOf('agent', U(1)) === 1.0, engine.kappaOf('agent', U(1)))
check('low agent kappa resolves (0.2)', engine.kappaOf('agent', U(2)) === 0.2, engine.kappaOf('agent', U(2)))
check('workflow kappa resolves through the uuid map', engine.kappaOf('workflow', U(20)) === 0.7, engine.kappaOf('workflow', U(20)))
check('platform kappa resolves through the uuid map', engine.kappaOf('platform', U(30)) === 0.4, engine.kappaOf('platform', U(30)))
check('blastRadius is non-zero for a uuid-keyed agent with dependents', engine.blastRadius('agent', U(2)) > 0, engine.blastRadius('agent', U(2)))

console.log('\n----------------------------------------')
console.log('passed: ' + passed + '   failed: ' + failed)
console.log(failed === 0 ? 'UUID ID-SPACE TESTS PASSED ✅' : 'UUID ID-SPACE TESTS FAILED ❌')
console.log('----------------------------------------\n')
process.exit(failed === 0 ? 0 : 1)

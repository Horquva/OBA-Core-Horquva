/*
 * OBA Core — Knowledge Graph unit test (MVP)
 * No external test framework. No Supabase/DB needed.
 * Run from the backend/ folder:  node tests/graph.unit.test.js
 *
 * Covers the RelationshipRegistry's `metadata` passthrough, which BUILD_SPEC's
 * D1 depends on: every `owns` edge must be able to carry `metadata.source`.
 * The registry destructures a fixed field list, so anything not named there is
 * silently dropped — these tests exist to keep that from regressing.
 */

const EntityRegistry = require('../brain/knowledge/entityRegistry')
const RelationshipRegistry = require('../brain/knowledge/relationshipRegistry')
const A = require('../brain/modules/analytics')

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

console.log('\n=== OBA Core — Knowledge Graph Unit Test ===\n')

const entities = new EntityRegistry()
const rels = new RelationshipRegistry(entities)

const alice = entities.upsert({ type: 'employee', name: 'Alice' })
const bob = entities.upsert({ type: 'employee', name: 'Bob' })
const system = entities.upsert({ type: 'system', name: 'Core Platform' })

// ─── metadata passthrough ───
const owned = rels.add({
	from: alice.id, to: system.id, type: 'owns',
	metadata: { source: 'agents.owner_id' },
})
check('metadata survives add()', owned.metadata && owned.metadata.source === 'agents.owner_id')

const collab = rels.add({
	from: alice.id, to: bob.id, type: 'collaborates_with',
	metadata: { source: 'derived', basis: 'raci', on: 'Incident Response' },
})
check('metadata keeps every key', !!collab.metadata && collab.metadata.basis === 'raci' && collab.metadata.on === 'Incident Response')

const bare = rels.add({ from: bob.id, to: system.id, type: 'uses' })
check('metadata defaults to {} when omitted', bare.metadata && typeof bare.metadata === 'object' && Object.keys(bare.metadata).length === 0)

// ─── existing behaviour must be untouched ───
check('criticality still defaults to medium', bare.criticality === 'medium')
check('explicit criticality still honoured', owned.criticality === 'medium' && rels.add({ from: bob.id, to: alice.id, type: 'manages', criticality: 'high' }).criticality === 'high')
check('ontology still rejects unknown types', (() => {
	try { rels.add({ from: alice.id, to: bob.id, type: 'befriends' }); return false } catch { return true }
})())
check('dangling source still rejected', (() => {
	try { rels.add({ from: 'ent_nope', to: bob.id, type: 'owns' }); return false } catch { return true }
})())
check('dedupe still returns the original edge', rels.add({ from: alice.id, to: system.id, type: 'owns' }).id === owned.id)
check('graph still validates', rels.validate().valid === true)

// ─── singlePointsOfFailure() must read criticality off the asset itself,
// not the `owns` edge (regression test for the SPOF criticality-blindness
// fix: relationshipRegistry.add() defaults an edge's criticality to
// 'medium', and knowledge/tool-ownership/process/decision `owns` edges never
// set one explicitly, so reading the edge silently capped every asset of
// those kinds below the 'high' SPOF threshold regardless of the asset's own
// risk/criticality column) ───
{
  const g2entities = new EntityRegistry()
  const g2rels = new RelationshipRegistry(g2entities)
  const g2 = { entities: g2entities, relationships: g2rels }

  const owner = g2entities.upsert({ type: 'employee', name: 'Sole Owner' })
  const criticalKnowledge = g2entities.upsert({
    type: 'knowledge', name: 'Security scanning configuration',
    metadata: { criticality: 'critical' },
  })
  // `owns` edge carries no criticality — exactly what knowledge_assets `owns`
  // edges look like in graphLoader — so it defaults to 'medium' on the edge.
  g2rels.add({ from: owner.id, to: criticalKnowledge.id, type: 'owns' })

  const spofs = A.singlePointsOfFailure(g2)
  check(
    'knowledge asset with high edge-default but critical OWN criticality is now reported as SPOF',
    spofs.some((s) => s.id === criticalKnowledge.id),
  )

  // Sanity check the resolver's per-type mapping directly too.
  check('assetCriticality reads workflow-kind risk off metadata.risk',
    A.assetCriticality({ type: 'workflow', metadata: { risk: 'critical' } }, 'medium') === 'critical')
  check('assetCriticality reads platform-kind criticality off metadata.assetCriticality',
    A.assetCriticality({ type: 'ai_agent', metadata: { kind: 'ai-platform', assetCriticality: 'high' } }, 'medium') === 'high')
  check('assetCriticality falls back to the edge for process (no own criticality column exists)',
    A.assetCriticality({ type: 'process', metadata: {} }, 'critical') === 'critical')
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`)
process.exit(failed === 0 ? 0 : 1)

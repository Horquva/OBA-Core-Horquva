/*
 * OBA Core — Agent validator test fixtures (entity side).
 *
 * Shaped to the REAL sql/01_schema_migration.sql columns, not to whatever
 * constitution.js's buildRoster() happened to read. The previous version
 * of this fixture was deliberately mirrored to buildRoster()'s (buggy)
 * field assumptions — same wrong `platforms` key, same invented
 * `criticality`/`active`/`ownerName`/`dependencyCount` columns — which is
 * exactly what let both bugs ship invisibly: the fixture and the code it
 * tested agreed with each other while both disagreed with production.
 */

const fakeRoots = {
	employees: [
		{ id: 1, name: 'Sarah Mitchell', role: 'VP Engineering', department: 'Engineering', risk: 'high' },
		{ id: 2, name: 'Omar Hassan', role: 'Data Lead', department: 'Data', risk: 'normal' },
	],
	agents: [
		{ id: 10, name: 'DeployBot', type: 'automation', status: 'active', risk: 'high', owner_id: 1 },
		{ id: 11, name: 'ContentGenerator', type: 'content', status: 'active', risk: 'normal', owner_id: 2 },
		{ id: 12, name: 'KnowledgeIndexer', type: 'search', status: 'active', risk: 'high', owner_id: 2 },
	],
	workflows: [
		{ id: 100, name: 'Quarterly Close', department: 'Engineering', risk: 'high' },
	],
	workflow_runbooks: [
		{ id: 1, workflow_id: 100, owner_id: 1, is_documented: true },
	],
	// The real table is `ai_platforms`, not `platforms`.
	ai_platforms: [
		{ id: 50, name: 'Snowflake', type: 'data-warehouse', status: 'active' },
	],
	// knowledge_assets rows carry a `topic`, not a `name`.
	knowledge_assets: [
		{ id: 1, asset_type: 'platform', asset_id: 50, topic: 'Snowflake access policy', is_documented: true, criticality: 'high' },
	],
}

module.exports = { fakeRoots }
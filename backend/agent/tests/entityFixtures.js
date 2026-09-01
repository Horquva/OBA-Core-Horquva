/*
 * OBA Core — Agent validator test fixtures (entity side).
 * Shaped exactly like `roots` in constitution.js's buildRoster(), so the
 * entity allowlist validator can be built and tested against realistic
 * data before it's wired into the real turn context.
 */

const fakeRoots = {
	employees: [
		{ id: 'emp-1', name: 'Sarah Mitchell', role: 'VP Engineering', department: 'Engineering', criticality: 'high', active: true },
		{ id: 'emp-2', name: 'Omar Hassan', role: 'Data Lead', department: 'Data', criticality: 'standard', active: true },
	],
	agents: [
		{ id: 'agt-1', name: 'DeployBot', type: 'automation', purpose: 'deployments', criticality: 'high' },
		{ id: 'agt-2', name: 'ContentGenerator', type: 'content', purpose: 'marketing copy', criticality: 'standard' },
		{ id: 'agt-3', name: 'KnowledgeIndexer', type: 'search', purpose: 'indexing docs', criticality: 'high' },
	],
	workflows: [
		{ id: 'wf-1', name: 'Quarterly Close', ownerName: 'Sarah Mitchell', criticality: 'high', dependencyCount: 4 },
	],
	platforms: [
		{ id: 'plat-1', name: 'Snowflake', type: 'data-warehouse', criticality: 'high' },
	],
}

module.exports = { fakeRoots }
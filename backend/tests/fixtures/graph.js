/*
 * A minimal but ontology-valid organization, so brain tests need no database.
 * Replaces the deleted graphSeeder.js for test purposes only — it is a fixture,
 * not demo data the application can ever serve. Covers every entity type and
 * relationship type the analyses query, with at least one instance of each.
 */

const KnowledgeGraph = require('../../brain/knowledge/knowledgeGraph')

function buildTestGraph() {
	const g = new KnowledgeGraph()

	const org = g.addEntity({ type: 'organization', name: 'Test Org' })
	const dept = g.addEntity({ type: 'department', name: 'Engineering' })
	const exec = g.addEntity({ type: 'executive', name: 'Chief Executive' })
	const lead = g.addEntity({ type: 'employee', name: 'Engineering Lead' })
	const eng = g.addEntity({ type: 'employee', name: 'Engineer' })
	const agent = g.addEntity({ type: 'ai_agent', name: 'Test Agent' })
	const platform = g.addEntity({ type: 'ai_agent', name: 'Test Platform' })
	const wf = g.addEntity({ type: 'workflow', name: 'Test Workflow' })
	const kn = g.addEntity({ type: 'knowledge', name: 'Test Runbook' })
	const pol = g.addEntity({ type: 'policy', name: 'Test Policy' })

	g.addRelationship({ from: dept.id, to: org.id, type: 'supports' })
	g.addRelationship({ from: exec.id, to: dept.id, type: 'owns' })
	g.addRelationship({ from: lead.id, to: exec.id, type: 'reports_to' })
	g.addRelationship({ from: eng.id, to: lead.id, type: 'reports_to' })
	g.addRelationship({ from: exec.id, to: lead.id, type: 'manages' })
	g.addRelationship({ from: exec.id, to: agent.id, type: 'owns', criticality: 'high' })
	g.addRelationship({ from: lead.id, to: platform.id, type: 'owns' })
	g.addRelationship({ from: lead.id, to: wf.id, type: 'owns' })
	g.addRelationship({ from: eng.id, to: kn.id, type: 'owns' })
	g.addRelationship({ from: eng.id, to: platform.id, type: 'uses' })
	g.addRelationship({ from: wf.id, to: agent.id, type: 'depends_on', criticality: 'high' })
	g.addRelationship({ from: agent.id, to: platform.id, type: 'depends_on', criticality: 'medium' })
	g.addRelationship({ from: pol.id, to: agent.id, type: 'governs' })
	g.addRelationship({ from: kn.id, to: wf.id, type: 'supports' })
	g.addRelationship({ from: lead.id, to: eng.id, type: 'collaborates_with' })

	return g
}

module.exports = { buildTestGraph }

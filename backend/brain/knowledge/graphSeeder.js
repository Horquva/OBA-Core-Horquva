/**
 * GRAPH SEEDER — discovered organizational reality
 * ------------------------------------------------
 * Simulates the output of Huzaifa's reality-layer discovery modules
 * (M01 Ownership, M02 Dependency, M08 Workflow, M19 Governance, M20
 * Accountability, M28 Universal Dependency Graph, ...): it populates the
 * Unified Knowledge Graph with a representative organization so that Graph
 * APIs, traversal, and the Brain Runtime return real, connected intelligence
 * out of the box.
 *
 * In production this is replaced by live discovery / Supabase import; the
 * structure of entities + relationships stays identical.
 */

function seedDemoOrganization(graph) {
  const E = (spec) => graph.addEntity(spec)
  const R = (from, type, to, extra = {}) =>
    graph.addRelationship({ from: from.id, to: to.id, type, ...extra })

  // ─── Organization + departments ───
  const org = E({ type: 'organization', name: 'Horquva Pilot Org', metadata: { industry: 'Technology' } })
  const eng = E({ type: 'department', name: 'Engineering' })
  const ops = E({ type: 'department', name: 'Operations' })
  const hr = E({ type: 'department', name: 'People & Culture' })

  // ─── People / executives ───
  const ceo = E({ type: 'executive', name: 'Chief Executive', metadata: { role: 'CEO' } })
  const cto = E({ type: 'executive', name: 'Chief Technology Officer', metadata: { role: 'CTO' } })
  const engLead = E({ type: 'employee', name: 'Engineering Lead' })
  const opsLead = E({ type: 'employee', name: 'Operations Lead' })
  const hrLead = E({ type: 'employee', name: 'People Lead' })

  // ─── Systems / AI agents / workflows / knowledge ───
  const platform = E({ type: 'system', name: 'Core Platform' })
  const billing = E({ type: 'system', name: 'Billing System' })
  const oba = E({ type: 'ai_agent', name: 'Organizational Brain Assistant' })
  const onboarding = E({ type: 'workflow', name: 'Customer Onboarding' })
  const incidentWf = E({ type: 'workflow', name: 'Incident Response' })
  const runbook = E({ type: 'knowledge', name: 'Platform Runbook' })
  const govPolicy = E({ type: 'policy', name: 'Access Governance Policy' })

  // ─── Ownership (M01) ───
  R(ceo, 'manages', cto)
  R(cto, 'manages', engLead)
  R(cto, 'owns', platform, { criticality: 'high' })
  R(engLead, 'owns', billing, { criticality: 'high' })
  R(opsLead, 'owns', incidentWf)
  R(hrLead, 'owns', onboarding)
  R(engLead, 'owns', runbook, { criticality: 'high' })

  // ─── Reporting / accountability (M20) ───
  R(engLead, 'reports_to', cto)
  R(opsLead, 'reports_to', cto)
  R(hrLead, 'reports_to', ceo)

  // ─── Dependencies (M02 / M28) ───
  R(billing, 'depends_on', platform, { criticality: 'high', failureImpact: 'Billing halts if platform is down' })
  R(onboarding, 'depends_on', platform, { criticality: 'high' })
  R(onboarding, 'depends_on', billing, { criticality: 'medium' })
  R(incidentWf, 'depends_on', runbook, { criticality: 'high' })
  R(oba, 'depends_on', platform, { criticality: 'high' })

  // ─── Governance (M19) ───
  R(govPolicy, 'governs', platform)
  R(govPolicy, 'governs', billing)
  R(cto, 'controls', govPolicy)

  // ─── Collaboration / ecosystem (M29 / M31) ───
  R(engLead, 'collaborates_with', opsLead)
  R(oba, 'supports', ceo)
  R(platform, 'supports', onboarding)

  // department membership
  R(engLead, 'reports_to', cto)
  R(cto, 'owns', eng)
  R(opsLead, 'owns', ops)
  R(hrLead, 'owns', hr)

  return graph.stats()
}

module.exports = { seedDemoOrganization }

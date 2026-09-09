/*
 * OBA Core — Golden-question regression suite (W-L 13.4).
 *
 * "A fixed set of roughly twenty questions with expected grounding —
 *  which tools should be called, which entities should appear, and
 *  that the numeric validator reports clean. Run against a stub
 *  provider in CI for the deterministic parts, and against the live
 *  provider manually before any release." (implementation plan §13.4)
 *
 * Each entry is a question plus the grounding it MUST produce. This
 * file does not run the agent itself — it is the fixed answer key that
 * a runner (against either a stub or the live provider) checks its
 * actual output against.
 *
 * Tool names, argument shapes, and scenario enum values below are
 * taken directly from the real tool files, not assumed:
 *   - backend/tools/read-tools.js        (11.2)
 *   - backend/tools/simulation-tools.js  (11.3)
 *   - backend/tools/simulate-reassignment.js (13.2)
 *
 * run_brain_analysis is intentionally never targeted here — its own
 * source notes it is "not yet wired... needs follow-up before this
 * tool is usable."
 */

const goldenQuestions = [
	// ── Org snapshot / counts ──────────────────────────────────────────
	{
		id: 'gq-01',
		question: 'How many employees, agents, workflows, and platforms do we have?',
		expectedTools: ['get_org_snapshot'],
		expectedEntities: [],
		notes: 'Pure counts — no specific entity should be named.',
	},

	// ── Entity resolution ──────────────────────────────────────────────
	{
		id: 'gq-02',
		question: 'Who is Sarah Mitchell?',
		expectedTools: ['resolve_entity'],
		expectedEntities: ['Sarah Mitchell'], // confirmed real: employees id 9, Security Engineer, Engineering, critical
	},
	{
		id: 'gq-03',
		question: 'Tell me everything about DeployBot.',
		expectedTools: ['resolve_entity', 'get_entity_profile'],
		expectedEntities: ['DeployBot'],
		notes: 'resolve_entity first (per its description), then get_entity_profile with the resolved id/type.',
	},

	// ── Listing / browsing ───────────────────────────────────────────────
	{
		id: 'gq-04',
		question: 'List all employees in Engineering.',
		expectedTools: ['list_entities'],
		expectedArgs: { type: 'EMPLOYEE', department: 'ENGINEERING' },
		notes: 'Must use the fixed enum values (VALID_DEPARTMENTS/VALID_ENTITY_TYPES) — never free text.',
	},
	{
		id: 'gq-05',
		question: 'What agents do we have?',
		expectedTools: ['list_entities'],
		expectedArgs: { type: 'AGENT' },
	},

	// ── Intelligence / risk ─────────────────────────────────────────────
	{
		id: 'gq-06',
		question: 'What is DeployBot\'s risk level?',
		expectedTools: ['resolve_entity', 'get_intelligence'],
		expectedEntities: ['DeployBot'],
		notes: 'Numbers/labels in the answer (risk, criticality) must trace to get_intelligence\'s result.',
	},

	// ── Metric glossary ──────────────────────────────────────────────────
	{
		id: 'gq-07',
		question: 'What does our overall organizational health score actually measure?',
		expectedTools: ['get_metric_definition'],
		expectedArgs: { metricName: 'orgHealth' }, // confirmed real key in metricGlossary.js
		notes: 'Answer should mention the incident-load penalty (25 pts/failure) is a chosen constant, per the glossary\'s own authoredNote — not present it as a pure measurement.',
	},

	// ── Single-scenario simulations (run_simulation) ─────────────────────
	{
		id: 'gq-08',
		question: 'What happens if DeployBot fails?',
		expectedTools: ['resolve_entity', 'run_simulation'],
		expectedArgs: { scenario: 'agent_fails' },
		expectedEntities: ['DeployBot'],
		notes: 'Answer must cite real impactedAgents/impactedWorkflows/healthDelta from the result, nothing invented.',
	},
	{
		id: 'gq-09',
		question: 'What happens if Sarah Mitchell leaves?',
		expectedTools: ['resolve_entity', 'run_simulation'],
		expectedArgs: { scenario: 'employee_leaves' },
		notes: 'Plain "leaves" scenario, no successor named — simulate_reassignment must NOT be called here. Confirmed real employee (id 9, critical risk).',
	},
	{
		id: 'gq-10',
		question: 'What is the impact if GitHub Copilot goes down?',
		expectedTools: ['resolve_entity', 'run_simulation'],
		expectedArgs: { scenario: 'platform_down' },
		notes: 'Confirmed real platform (ai_platforms id 3, active, 78% adoption) — platform_down dispatches on agent_platform links, not on the platform\'s own risk (platforms carry no risk column).',
	},
	{
		id: 'gq-11',
		question: 'What breaks if the Financial Reporting workflow is disrupted?',
		expectedTools: ['resolve_entity', 'run_simulation'],
		expectedArgs: { scenario: 'workflow_disruption' },
		notes: 'Confirmed real workflow (id 7, Finance dept, high risk).',
	},

	// ── Org-wide ranking (rank_scenarios) ─────────────────────────────────
	{
		id: 'gq-12',
		question: "What's our biggest risk right now?",
		expectedTools: ['rank_scenarios'],
		notes: 'No specific entity named by the user — must use rank_scenarios, not run_simulation.',
	},
	{
		id: 'gq-13',
		question: 'Give me the top 3 things we should worry about.',
		expectedTools: ['rank_scenarios'],
		expectedArgs: { limit: 3 },
	},

	// ── Reassignment / succession (simulate_reassignment, 13.2) ───────────
	{
		id: 'gq-14',
		question: 'What if Omar Hassan takes over for Sarah Mitchell?',
		expectedTools: ['resolve_entity', 'simulate_reassignment'],
		notes: 'Named successor — must call simulate_reassignment, NOT plain run_simulation(employee_leaves). Both confirmed real (ids 10 and 9).',
	},
	{
		id: 'gq-15',
		question: 'If Sarah Mitchell leaves and Omar Hassan takes over, does Omar end up as a single point of failure?',
		expectedTools: ['resolve_entity', 'simulate_reassignment'],
		notes: 'Answer\'s yes/no must trace to result.residualRisk.successorBecomesSpof, not be guessed.',
	},
	{
		id: 'gq-16',
		question: 'Does documentation coverage transfer when Omar Hassan takes over from Sarah Mitchell?',
		expectedTools: ['resolve_entity', 'simulate_reassignment'],
		notes: 'Correct answer per D-70 is "no" — checks result.residualRisk.assetsUndocumented is reported honestly, not assumed to reset to 0.',
	},

	// ── Comparison (compare_scenarios) ────────────────────────────────────
	{
		id: 'gq-17',
		question: 'Compare what happens if Sarah Mitchell just leaves versus if Omar Hassan takes over instead.',
		expectedTools: ['resolve_entity', 'compare_scenarios'],
		notes: 'Two distinct scenario objects — the tool computes healthDeltaDifference; the model must never subtract the two numbers itself (I-3).',
	},

	// ── Missing / insufficient data (I-6) ─────────────────────────────────
	{
		id: 'gq-18',
		question: 'What happens if an employee who does not exist leaves?',
		expectedTools: ['resolve_entity'],
		notes: 'resolve_entity should return no match; the answer must say so plainly rather than inventing a scenario. run_simulation should not be called with a fabricated id.',
	},
	{
		id: 'gq-19',
		question: 'What is our "trust index"?', // deliberately not a real metric
		expectedTools: ['get_metric_definition'],
		notes: 'get_metric_definition returns null/no entry — per I-6, answer must say the metric is not measured/defined, never invent a definition.',
	},

	// ── Navigation offer ───────────────────────────────────────────────────
	// REMOVED (not GUESSED): propose_navigation does not exist anywhere in
	// this branch yet — `git grep -n "propose_navigation" -- backend`
	// returned nothing. Task 12.2 (navigation catalog) is Saad's, on the
	// Backend team, and per the plan's own dependency table AI's 11.1 feeds
	// it, not the other way around. Add this case back once 12.2 lands and
	// the real tool name/args are confirmed from its source, not guessed.
]

module.exports = { goldenQuestions }

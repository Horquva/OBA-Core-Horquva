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
 *   - backend/tools/read-tools.js            (11.2 — incl. run_brain_analysis,
 *     wired to domain.graph rather than left a permanent stub)
 *   - backend/tools/simulation-tools.js      (11.3)
 *   - backend/tools/simulate-reassignment.js (13.2)
 *   - backend/tools/propose-navigation.js    (12.2)
 *
 * run_brain_analysis is still not targeted by any question below: it needs
 * a loaded knowledge graph to answer for real, which this offline/stub CI
 * run has no way to provide — see its own honest "graph not ready" path
 * (readTools.unit.test.js) for the case that IS covered offline. Exercise
 * it manually against the live provider (§13.4's own split between a CI
 * run and a pre-release live run) once the graph is loaded.
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
	{
		id: 'gq-03b',
		question: 'Does Chen have a backup owner?',
		expectedTools: ['resolve_entity'],
		expectedEntities: ['Robert Chen', 'Sophia Chen'],
		notes: '§18.2\'s required "ambiguous name" case. Confirmed real, live-queried pair sharing a surname (employees table, no fabricated names) — resolve_entity must return BOTH and the answer must ask which one, never silently pick one (I-2/resolve_entity\'s own contract).',
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
	// 12.2 (navigation catalog, Backend team) has now landed in this branch
	// — real tool name/args confirmed from backend/tools/propose-navigation.js
	// and backend/agent/navigationCatalog.js's own SUPPORTED_SLUGS, not guessed.
	{
		id: 'gq-20',
		question: "What's our biggest organizational risk right now? Show me where to look.",
		expectedTools: ['rank_scenarios', 'propose_navigation'],
		expectedArgs: { slug: 'risks' },
		notes: 'Acceptance demo §2.3 turn 6: the agent OFFERS navigation after answering, it never navigates on its own — propose_navigation returns a link for the client to render as a button, not an instruction to move the user.',
	},

	// ── Follow-up chain (§18.2) ──────────────────────────────────────────
	// Two turns sharing one conversation. The second must answer from the
	// FIRST turn's own tool result without re-calling anything — an empty
	// expectedTools here is the correct, asserted behaviour, not an
	// oversight (see goldenQuestions.unit.test.js's handling of `followsFrom`).
	{
		id: 'gq-21',
		question: 'What happens if Robert Chen leaves?',
		expectedTools: ['resolve_entity', 'run_simulation'],
		expectedArgs: { scenario: 'employee_leaves' },
		expectedEntities: ['Robert Chen'],
		notes: 'First turn of the follow-up chain (gq-21 → gq-22). Establishes the impactedWorkflows the next turn must reuse.',
	},
	{
		id: 'gq-22',
		question: 'Which of those workflows are documented?',
		expectedTools: [],
		expectedEntities: [],
		followsFrom: 'gq-21',
		notes: 'Must answer from gq-21\'s own run_simulation result (impactedWorkflows) without calling any tool again, and must name only workflows that actually appeared there — not the full workflow list.',
	},
]

module.exports = { goldenQuestions }

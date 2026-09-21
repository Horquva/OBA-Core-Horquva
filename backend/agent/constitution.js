// backend/agent/constitution.js
//
// Task 11.4 — Constitution: system rules + org roster for the model.
//
// Two parts:
//   1. CONSTITUTION  — the fixed rules text (quote numbers, resolve names,
//      admit missing data, defer computation to tools, cite context,
//      multi-turn awareness) plus the list of tools currently registered
//      and callable (12 — see the note below the list; the plan's
//      Appendix A names a 13th, get_page_context, that isn't wired into
//      the tool registry yet).
//   2. buildRoster(roots) / buildFullConstitution(roots) — turns real org
//      data (employees, agents, workflows, platforms) into a compact text
//      roster appended after the rules, so the model can resolve real
//      names instead of guessing.
//
// The roster below reads real sql/01_schema_migration.sql columns only.
// employees/agents/ai_platforms have no `criticality`/`active`/`purpose`
// column — those are either not a real signal (employees don't carry a
// criticality of their own; nothing records an agent's "purpose") or
// derived rather than stored (criticality comes from
// domain/definitions.js's entityCriticality(), never a raw column — I-4).

const { entityCriticality } = require('../domain/definitions')

const CONSTITUTION = `
# Executive Agent System Rules

You are an executive assistant analyzing organizational data.

## CRITICAL RULES YOU MUST FOLLOW

### Rule 1: QUOTE NUMBERS, NEVER CALCULATE
- The model (you) will NEVER do math
- When you see a number from a tool, use it exactly
- NEVER calculate 123 - 45 yourself
- ALWAYS say: "According to [tool_name], the score is 78"
- If you need to compare numbers, ALWAYS call a tool that does the comparison

### Rule 2: RESOLVE NAMES BEFORE USING
- NEVER say "Sarah" without first checking: which Sarah?
- ALWAYS call resolve_entity tool for any person/team name
- If resolve_entity returns multiple candidates, acknowledge the ambiguity
- NEVER assume you know which one the user means
- Always confirm the full name and ID

### Rule 3: ADMIT WHEN DATA IS MISSING
- When a metric doesn't exist, say exactly: "This metric is not measured"
- NEVER guess or estimate numbers
- NEVER fill gaps with invented data
- If data exists but quality is low, report the measurement coverage percentage
- Insufficient evidence is a valid answer, not a problem to hide

### Rule 4: EVERY NUMBER AND COMPARISON COMES FROM A TOOL
- EVERY number in your answer must trace back to a tool result
- EVERY comparison must come from a comparison_tool
- If comparing two scenarios, ALWAYS use compare_scenarios tool (it does the math)
- Never subtract numbers yourself
- Never divide or calculate ratios yourself
- Always defer computation to tools

### Rule 5: REFER TO CONTEXT FROM TOOLS
- NEVER invent organizational context
- NEVER assume workflow dependencies, employee skills, or team structure
- ALWAYS use get_entity_profile or get_intelligence when you need details
- Cite which tool you called for each piece of context

### Rule 6: MULTI-TURN AWARENESS
- You can reference previous turns if relevant
- Do not re-run tools if the answer came from prior results
- Acknowledge when you're using cached information from earlier in the conversation

## YOUR TOOLS (13 total)

The following tools are your only interface to organizational data:

READ TOOLS (7):
- resolve_entity(query, type) → resolve names to real IDs
- get_org_snapshot() → current org state
- get_entity_profile(entityId, entityType) → full details on person/agent/workflow/platform
- list_entities(type, department) → browse entities
- get_intelligence(entityId, entityType) → pull computed risk/criticality/SPOF status
- run_brain_analysis(analysisType, targetId?) → deep graph analysis
- get_metric_definition(metricName) → what does this metric mean?

SIMULATION TOOLS (4):
- run_simulation(scenario, targetId) → what-if: what if this person/agent/platform leaves or fails
- rank_scenarios(limit?) → org-wide worst-first ranking
- compare_scenarios(scenarioA, scenarioB) → A vs B with differences calculated for you
- simulate_reassignment(fromEmployeeId, toEmployeeId) → what if one person takes over another's responsibilities

PAGE & NAVIGATION TOOLS (2):
- get_page_context(slug) → metrics behind the dashboard page the user is currently looking at
- propose_navigation(finding) → offer link to relevant page in the app

DO NOT INVENT TOOLS. Use only these 13.

get_page_context (Task 12.7) reads intel fields that do not yet match
domain/derived.js's real output shape (a known, unfixed bug) — its results
may be incomplete or null even when real data exists. Treat missing
get_page_context fields as "not available from this tool" rather than
"the organization has no data here."

## TONE & STYLE
- Executive level: clear, direct, data-driven
- Cite numbers with context: "78 (high risk zone)" not just "78"
- Explain why something matters: "This matters because 14 workflows depend on her"
- One finding per paragraph; don't overwhelm
- Always explain the path: "Here's what I found and how I found it"
`

/**
 * Turn flat org data into a compact, model-readable roster.
 * @param {object} roots  the frozen roots bundle (domain/derived.js's loadRoots())
 */
function buildRoster(roots) {
  const employees = roots?.employees || []
  const agents = roots?.agents || []
  const workflows = roots?.workflows || []
  // The real root table is `ai_platforms`, not `platforms` — the latter is
  // always undefined, which is why this section used to always report zero
  // platforms regardless of how many actually exist.
  const platforms = roots?.ai_platforms || []
  const knowledgeAssets = roots?.knowledge_assets || []

  const employeeById = new Map(employees.map((e) => [e.id, e]))
  // workflows carries no owner column of its own — ownership is one hop
  // away, through workflow_runbooks.
  const runbookByWorkflow = new Map((roots?.workflow_runbooks || []).map((r) => [r.workflow_id, r]))

  let roster = `
## ORGANIZATIONAL ROSTER

This is the complete, authoritative list of entities in our organization.
Reference this when resolving names or understanding structure.

### EMPLOYEES (${employees.length} total)
`
  for (const emp of employees) {
    roster += `
- **${emp.name}** (ID: ${emp.id})
  Role: ${emp.role}
  Department: ${emp.department}
  Risk: ${emp.risk || 'unmeasured'}`
  }

  roster += `

### AGENTS (${agents.length} total)
`
  for (const agent of agents) {
    const owner = agent.owner_id != null ? employeeById.get(agent.owner_id) : null
    roster += `
- **${agent.name}** (ID: ${agent.id})
  Type: ${agent.type}
  Status: ${agent.status}
  Owner: ${owner ? owner.name : 'None'}
  Criticality: ${entityCriticality('agent', agent)}`
  }

  roster += `

### WORKFLOWS (${workflows.length} total)
`
  for (const wf of workflows) {
    const runbook = runbookByWorkflow.get(wf.id)
    const owner = runbook && runbook.owner_id != null ? employeeById.get(runbook.owner_id) : null
    roster += `
- **${wf.name}** (ID: ${wf.id})
  Department: ${wf.department}
  Owner: ${owner ? owner.name : 'None'}
  Criticality: ${entityCriticality('workflow', wf)}`
  }

  roster += `

### PLATFORMS & SYSTEMS (${platforms.length} total)
`
  for (const plat of platforms) {
    roster += `
- **${plat.name}** (ID: ${plat.id})
  Type: ${plat.type}
  Status: ${plat.status}
  Criticality: ${entityCriticality('platform', plat, { knowledgeAssets })}`
  }

  return roster
}

/** Rough estimate: 1 token ≈ 1.3 words. */
function estimateTokens(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.ceil(words / 1.3)
}

/**
 * Combine the fixed rules with a real org roster and report whether the
 * result fits the model's context budget.
 */
function buildFullConstitution(roots) {
  const roster = buildRoster(roots)
  const fullText = CONSTITUTION + roster
  const tokenCount = estimateTokens(fullText)

  return {
    systemInstruction: fullText,
    rosterTokenCount: tokenCount,
    withinBudget: tokenCount >= 3000 && tokenCount <= 5000,
    warning:
      tokenCount > 5000
        ? `Roster is ${tokenCount} tokens (over 5000 limit)`
        : tokenCount < 3000
        ? `Roster is ${tokenCount} tokens (under 3000 limit)`
        : 'Token count OK',
  }
}

module.exports = { CONSTITUTION, buildRoster, buildFullConstitution, estimateTokens }
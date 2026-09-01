// backend/agent/constitution.js
//
// Task 11.4 — Constitution: system rules + org roster for the model.
//
// Two parts:
//   1. CONSTITUTION  — the fixed rules text (quote numbers, resolve names,
//      admit missing data, defer computation to tools, cite context,
//      multi-turn awareness) plus the list of the 13 real tools.
//   2. buildRoster(roots) / buildFullConstitution(roots) — turns real org
//      data (employees, agents, workflows, platforms) into a compact text
//      roster appended after the rules, so the model can resolve real
//      names instead of guessing.

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
- get_entity_profile(id) → full details on person/team/workflow
- list_entities(type, filters) → browse entities
- get_intelligence(id) → pull insights/analysis
- run_brain_analysis(id, type) → deep analysis
- get_metric_definition(metric_name) → what does this metric mean?

SIMULATION TOOLS (3):
- run_simulation(employee_id, scenario_type) → what-if: what if person leaves
- rank_scenarios(scenarios) → rank by risk/impact
- compare_scenarios(scenario_a, scenario_b) → A vs B with differences calculated

NAVIGATION TOOLS (1):
- propose_navigation(finding) → offer link to relevant page in the app

DO NOT INVENT TOOLS. Use only these 13.

## TONE & STYLE
- Executive level: clear, direct, data-driven
- Cite numbers with context: "78 (high risk zone)" not just "78"
- Explain why something matters: "This matters because 14 workflows depend on her"
- One finding per paragraph; don't overwhelm
- Always explain the path: "Here's what I found and how I found it"
`

/**
 * Turn flat org data into a compact, model-readable roster.
 * @param {object} roots  { employees: [], agents: [], workflows: [], platforms: [] }
 */
function buildRoster(roots) {
  const employees = roots?.employees || []
  const agents = roots?.agents || []
  const workflows = roots?.workflows || []
  const platforms = roots?.platforms || []

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
  Criticality: ${emp.criticality || 'standard'}
  Active: ${emp.active ? 'Yes' : 'No'}`
  }

  roster += `

### AGENTS (${agents.length} total)
`
  for (const agent of agents) {
    roster += `
- **${agent.name}** (ID: ${agent.id})
  Type: ${agent.type}
  Purpose: ${agent.purpose}
  Criticality: ${agent.criticality || 'standard'}`
  }

  roster += `

### WORKFLOWS (${workflows.length} total)
`
  for (const wf of workflows) {
    roster += `
- **${wf.name}** (ID: ${wf.id})
  Owner: ${wf.ownerName}
  Criticality: ${wf.criticality}
  Dependencies: ${wf.dependencyCount || 0} workflows`
  }

  roster += `

### PLATFORMS & SYSTEMS (${platforms.length} total)
`
  for (const plat of platforms) {
    roster += `
- **${plat.name}** (ID: ${plat.id})
  Type: ${plat.type}
  Criticality: ${plat.criticality}`
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
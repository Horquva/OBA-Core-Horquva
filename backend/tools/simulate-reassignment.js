/**
 * Task 13.2 — The simulate_reassignment tool
 * 
 * This tool exposes the employeeLeavesWithSuccessor simulation
 * through the agent's tool registry.
 * 
 * Depends on:
 * - 13.1: employeeLeavesWithSuccessor (from domain/simulations.js)
 * - 11.3: Simulation tools framework
 */

const { employeeLeavesWithSuccessor } = require('../domain/simulations');

module.exports = {
  name: 'simulate_reassignment',
  
  description: `Call this when the user asks what happens if one specific person takes over another person's responsibilities. 
    Use resolve_entity first to get both person IDs, then call this tool. 
    This models a handover with a named successor — different from a simple "leaves" scenario.`,
  
  parameters: {
    type: 'object',
    properties: {
      fromEmployeeId: {
        type: 'string',
        description: 'The ID of the person who is leaving or stepping aside.'
      },
      toEmployeeId: {
        type: 'string',
        description: 'The ID of the person who takes over the responsibilities.'
      }
    },
    required: ['fromEmployeeId', 'toEmployeeId']
  },
  
  /**
   * Run the reassignment simulation on the frozen turn context.
   *
   * @param {Object} ctx - The frozen turn context (contains roots, intel, snapshotAt)
   * @param {Object} args - { fromEmployeeId, toEmployeeId }
   * @returns {Object} { data, notes, toolError? } — envelope() (agent/registry.js)
   *   wraps this and stamps provenance itself; a tool building its own
   *   provenance/authored object here is discarded silently (registry.js
   *   always rebuilds provenance from ctx/args and hardcodes authored:
   *   false — see agentRegistry.unit.test.js's "envelope.authored is
   *   always false"), so this now matches the shape every other tool in
   *   this file uses instead of fighting that.
   */
  run(ctx, args) {
    const { fromEmployeeId, toEmployeeId } = args;
    const { roots } = ctx;

    // Find both employees for validation and reporting. String() on both
    // sides because a live model call is bound by the schema above
    // (fromEmployeeId/toEmployeeId declared as strings) while roots ids
    // are numbers — this comparison already handled that correctly.
    const fromEmployee = roots.employees.find(e => String(e.id) === String(fromEmployeeId));
    const toEmployee = roots.employees.find(e => String(e.id) === String(toEmployeeId));

    if (!fromEmployee) {
      return {
        data: null,
        notes: [`Employee with ID "${fromEmployeeId}" not found in the organization.`],
      };
    }

    if (!toEmployee) {
      return {
        data: null,
        notes: [`Employee with ID "${toEmployeeId}" not found in the organization.`],
      };
    }

    // Run the simulation from 13.1 — using the EMPLOYEE RECORDS' real
    // (numeric) ids, not the original string args. Passing fromEmployeeId/
    // toEmployeeId straight through here was the bug: this function's own
    // lookups above coerce with String() and find the right people, but
    // employeeLeavesWithSuccessor() does a strict `===` against roots ids
    // internally, so the string args it used to receive never matched and
    // every real reassignment call fell into the branch below.
    const result = employeeLeavesWithSuccessor(fromEmployee.id, toEmployee.id, roots);

    if (!result) {
      return {
        data: null,
        notes: ['The reassignment simulation could not be completed.'],
      };
    }

    return {
      data: result,
      notes: [
        `Simulation: ${fromEmployee.name} hands over to ${toEmployee.name}.`,
        `This is a simulation based on current data — actual outcomes may differ.`,
      ],
    };
  }
};
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
   * @returns {Object} Wrapped result with provenance
   */
  run(ctx, args) {
    const { fromEmployeeId, toEmployeeId } = args;
    const { roots, snapshotAt } = ctx;
    
    // Find both employees for validation and reporting
    const fromEmployee = roots.employees.find(e => String(e.id) === String(fromEmployeeId));
    const toEmployee = roots.employees.find(e => String(e.id) === String(toEmployeeId));
    
    // Error: fromEmployee not found
    if (!fromEmployee) {
      return {
        data: null,
        provenance: { 
          computedAt: new Date().toISOString(), 
          snapshotAt,
          source: 'live',
          inputs: { fromEmployeeId, toEmployeeId }
        },
        evidence: null,
        authored: false,
        notes: [`Employee with ID "${fromEmployeeId}" not found in the organization.`],
        error: true
      };
    }
    
    // Error: toEmployee not found
    if (!toEmployee) {
      return {
        data: null,
        provenance: { 
          computedAt: new Date().toISOString(), 
          snapshotAt,
          source: 'live',
          inputs: { fromEmployeeId, toEmployeeId }
        },
        evidence: null,
        authored: false,
        notes: [`Employee with ID "${toEmployeeId}" not found in the organization.`],
        error: true
      };
    }
    
    // Run the simulation from 13.1
    const result = employeeLeavesWithSuccessor(fromEmployeeId, toEmployeeId, roots);
    
    // If the simulation returned null (unexpected error), handle it
    if (!result) {
      return {
        data: null,
        provenance: { 
          computedAt: new Date().toISOString(), 
          snapshotAt,
          source: 'live',
          inputs: { fromEmployeeId, toEmployeeId }
        },
        evidence: null,
        authored: false,
        notes: ['The reassignment simulation could not be completed.'],
        error: true
      };
    }
    
    // Success — wrap with full provenance
    return {
      data: result,
      provenance: {
        computedAt: new Date().toISOString(),
        snapshotAt,
        source: 'live',
        inputs: { 
          fromEmployeeId, 
          fromEmployeeName: fromEmployee.name,
          toEmployeeId,
          toEmployeeName: toEmployee.name
        }
      },
      evidence: null, // Simulations don't have evidence gates
      authored: false,
      notes: [
        `Simulation: ${fromEmployee.name} hands over to ${toEmployee.name}.`,
        `⚠️ This is a simulation based on current data. Actual outcomes may differ.`
      ]
    };
  }
};
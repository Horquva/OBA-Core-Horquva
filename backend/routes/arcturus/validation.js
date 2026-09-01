/**
 * GET /api/arcturus/validation/:experiment_id
 *
 * Returns validation results for a completed experiment.
 * Contract: ValidationResultContract from ecosystem.applications.arcturus.contracts.evaluation.base_models
 *
 * Response: {
 *   run_id: UUID,
 *   context: SimulationContext,
 *   passed_rules: string[],
 *   failed_rules: string[],
 *   flagged_rules: string[],
 *   final_status: "validated" | "rejected" | "inconclusive",
 *   reason: string | null,
 *   evaluated_at: ISO8601 timestamp
 * }
 */

const express = require('express');
const { v4: uuid } = require('uuid');

const router = express.Router();

/**
 * Mock validation results for demo/testing.
 * In production, these would be queried from a validation service database.
 */
const mockValidationResults = {
  'exp-001': {
    run_id: uuid(),
    context: {
      run_id: uuid(),
      trace_id: uuid(),
      experiment_id: 'exp-001',
      global_seed: 42,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      config: {
        scenario_id: 'scenario-sunrise',
        duration_ticks: 100,
        tick_delay_seconds: 0.5,
      },
    },
    passed_rules: ['logic_001', 'consistency_002', 'industry_pattern_005'],
    failed_rules: [],
    flagged_rules: ['industry_pattern_003'],
    final_status: 'validated',
    reason: 'All hard-fail rules passed. One soft-flag detected but non-blocking.',
    evaluated_at: new Date().toISOString(),
  },
  'exp-002': {
    run_id: uuid(),
    context: {
      run_id: uuid(),
      trace_id: uuid(),
      experiment_id: 'exp-002',
      global_seed: 99,
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      config: {
        scenario_id: 'scenario-attrition',
        duration_ticks: 200,
      },
    },
    passed_rules: ['logic_001', 'consistency_002'],
    failed_rules: ['industry_pattern_004', 'expected_outcome_002'],
    flagged_rules: [],
    final_status: 'rejected',
    reason: 'Hard-fail: Industry pattern violation detected. Attrition spike exceeds historical bounds.',
    evaluated_at: new Date().toISOString(),
  },
};

/**
 * GET /api/arcturus/validation/:experiment_id
 * Fetch validation results for an experiment.
 */
router.get('/:experiment_id', (req, res) => {
  const { experiment_id } = req.params;

  // Check if experiment has cached results
  if (mockValidationResults[experiment_id]) {
    return res.json(mockValidationResults[experiment_id]);
  }

  // Experiment not yet validated
  return res.status(404).json({
    error: 'Validation results not yet available',
    experiment_id,
    message: 'This experiment has not been evaluated by the validation platform yet.',
  });
});

module.exports = router;

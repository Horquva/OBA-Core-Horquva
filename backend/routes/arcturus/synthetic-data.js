/**
 * GET /api/arcturus/synthetic-data/:run_id/corpus
 *
 * Returns provisional synthetic data corpus preview for a simulation run.
 * Contract: SyntheticDataCorpusPreview from ecosystem.applications.arcturus.contracts.synthetic_data.base_models
 *
 * Frontend labels this as "provisional corpus preview" because:
 * - Artifacts are pre-validation (may not pass downstream validation gates)
 * - Complete lineage tracking is not yet available
 * - This is a snapshot, not the final validated corpus
 *
 * Response: {
 *   run_id: string,
 *   accepted_artifacts: SyntheticArtifact[],
 *   lineage_available: boolean,
 *   rejected_artifacts_available: boolean
 * }
 */

const express = require('express');
const { v4: uuid } = require('uuid');

const router = express.Router();

/**
 * Mock synthetic artifacts for demo/testing.
 * In production, these would be generated during simulation and persisted.
 */
const mockCorpus = {
  'run-001': {
    run_id: 'run-001',
    accepted_artifacts: [
      {
        artifact_id: 'artifact-synthetic-001',
        artifact_type: 'SyntheticPayrollRecord',
        lifecycle_state: 'accepted',
        content: {
          employee_id: 'emp-0042',
          period: '2026-01-01 to 2026-01-31',
          gross_pay: 5250.0,
          deductions: 1050.0,
          net_pay: 4200.0,
          overtime_hours: 4.5,
        },
        metadata: {
          confidence_level: 0.95,
          synthetic_method: 'differential_privacy',
        },
        provenance: {
          tick: 15,
          event_id: 'event-payroll-001',
        },
        created_at: new Date(Date.now() - 3300000).toISOString(),
      },
      {
        artifact_id: 'artifact-synthetic-005',
        artifact_type: 'SyntheticWorkforceAllocation',
        lifecycle_state: 'accepted',
        content: {
          team_id: 'team-product',
          allocated_capacity: 12.5,
          utilization_rate: 0.92,
          forecasted_demand: 13.8,
        },
        metadata: {
          confidence_level: 0.88,
          synthetic_method: 'agent_based_simulation',
        },
        provenance: {
          tick: 22,
          event_id: 'event-allocation-001',
        },
        created_at: new Date(Date.now() - 3200000).toISOString(),
      },
      {
        artifact_id: 'artifact-synthetic-012',
        artifact_type: 'SyntheticInventoryMetric',
        lifecycle_state: 'accepted',
        content: {
          sku: 'SKU-2024-CORE',
          current_stock: 4850,
          reorder_point: 3000,
          lead_time_days: 7,
          demand_forecast_weekly: 650,
        },
        metadata: {
          confidence_level: 0.91,
          synthetic_method: 'timeseries_projection',
        },
        provenance: {
          tick: 35,
          event_id: 'event-inventory-001',
        },
        created_at: new Date(Date.now() - 3100000).toISOString(),
      },
    ],
    lineage_available: false,
    rejected_artifacts_available: false,
  },
  'run-002': {
    run_id: 'run-002',
    accepted_artifacts: [
      {
        artifact_id: 'artifact-synthetic-042',
        artifact_type: 'SyntheticAttritionEvent',
        lifecycle_state: 'accepted',
        content: {
          employee_id: 'emp-1847',
          separation_reason: 'voluntary_resignation',
          notice_period_days: 14,
          role: 'Senior Software Engineer',
          tenure_years: 3.2,
        },
        metadata: {
          confidence_level: 0.99,
          synthetic_method: 'historical_pattern_matching',
        },
        provenance: {
          tick: 48,
          event_id: 'event-attrition-001',
        },
        created_at: new Date(Date.now() - 7100000).toISOString(),
      },
      {
        artifact_id: 'artifact-synthetic-048',
        artifact_type: 'SyntheticCompensationImpact',
        lifecycle_state: 'accepted',
        content: {
          policy_change: 'salary_freeze',
          affected_employees: 487,
          projected_attrition_lift: 0.23,
          financial_impact: -4200000,
        },
        metadata: {
          confidence_level: 0.85,
          synthetic_method: 'econometric_model',
        },
        provenance: {
          tick: 12,
          event_id: 'event-compensation-001',
        },
        created_at: new Date(Date.now() - 7150000).toISOString(),
      },
    ],
    lineage_available: false,
    rejected_artifacts_available: true,
  },
};

/**
 * GET /api/arcturus/synthetic-data/:run_id/corpus
 * Fetch provisional synthetic data corpus preview.
 */
router.get('/:run_id/corpus', (req, res) => {
  const { run_id } = req.params;

  // Check if corpus exists
  if (mockCorpus[run_id]) {
    return res.json(mockCorpus[run_id]);
  }

  // No corpus available yet
  return res.json({
    run_id,
    accepted_artifacts: [],
    lineage_available: false,
    rejected_artifacts_available: false,
    message: 'No synthetic data corpus available yet for this run.',
  });
});

module.exports = router;

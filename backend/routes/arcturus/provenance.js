/**
 * GET /api/arcturus/provenance/:experiment_id
 *
 * Returns provenance lineage records for a simulation run.
 * Contract: ProvenanceRecord from ecosystem.applications.arcturus.contracts.provenance.base_models
 *
 * Lineage enables tracing every artifact, metric, and event back to:
 * - Root experiment configuration
 * - Deterministic seed that generated it
 * - Exact tick when it was created
 * - Complete causal chain of parent hashes
 */

const express = require('express');
const { v4: uuid } = require('uuid');

const router = express.Router();

/**
 * Mock provenance records for demo/testing.
 * In production, these would be persisted during simulation execution.
 */
const mockProvenanceRecords = {
  'exp-001': [
    {
      experiment_id: 'exp-001',
      run_id: uuid(),
      seed: 42,
      tick: 0,
      event_id: 'event-init-001',
      entity_id: 'entity-workforce-001',
      parent_hashes: [],
      lineage_hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      metadata: {
        stage: 'initialization',
        state_snapshot: 'workforce_allocated',
      },
    },
    {
      experiment_id: 'exp-001',
      run_id: uuid(),
      seed: 42,
      tick: 10,
      event_id: 'event-demand-spike-001',
      entity_id: 'entity-inventory-001',
      parent_hashes: ['a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'],
      lineage_hash: 'q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      created_at: new Date(Date.now() - 3590000).toISOString(),
      metadata: {
        stage: 'execution',
        state_snapshot: 'demand_spike_detected',
      },
    },
    {
      experiment_id: 'exp-001',
      run_id: uuid(),
      seed: 42,
      tick: 45,
      event_id: 'event-artifact-validation-001',
      entity_id: 'artifact-synthetic-001',
      parent_hashes: ['q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2'],
      lineage_hash: 'g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7',
      created_at: new Date(Date.now() - 3540000).toISOString(),
      metadata: {
        stage: 'artifact_generation',
        artifact_type: 'SyntheticPayrollRecord',
      },
    },
  ],
};

/**
 * GET /api/arcturus/provenance/:experiment_id
 * Fetch complete provenance lineage for an experiment.
 */
router.get('/:experiment_id', (req, res) => {
  const { experiment_id } = req.params;

  // Check if provenance records exist
  if (mockProvenanceRecords[experiment_id]) {
    return res.json({
      experiment_id,
      lineage_available: true,
      records: mockProvenanceRecords[experiment_id],
      total_records: mockProvenanceRecords[experiment_id].length,
    });
  }

  // Provenance not yet persisted
  return res.json({
    experiment_id,
    lineage_available: false,
    records: [],
    total_records: 0,
    message:
      'Provenance lineage is not yet persisted for this experiment. ' +
      'Complete lineage will be available after simulation completes and validation passes.',
  });
});

module.exports = router;

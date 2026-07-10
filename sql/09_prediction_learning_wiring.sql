-- ============================================================
-- OBA — MIGRATION 09: Prediction & Learning Wiring (Chunk 10)
-- ============================================================
-- Decision: NO NEW TABLES REQUIRED for this chunk.
--
-- All wiring between Prediction, Learning, and the event/graph
-- foundation reuses existing tables:
--
--   failure_patterns     — Learning's existing table.
--                          The eventBus 'simulation.completed' and
--                          'risk.critical' handlers now upsert rows here
--                          so learning module data reflects live events,
--                          not just static seed data.
--
--   graph_edges          — predictiveRisk.js /critical and /emerging now
--                          read graph_edges in-degree to boost predicted_score
--                          for agents with many dependents.
--
--   system_events        — unchanged; already persists all events including
--                          'simulation.completed' and 'risk.critical'.
--
--   module_capabilities  — predictiveRisk (M11) and learning (M17) were
--                          already registered from Chunk 09. No new entries.
--
-- Summary of code changes (no schema migration needed):
--   services/eventBus.js         — Wire 1 (risk.critical) + Wire 5
--                                   (simulation.completed) now ALSO upsert
--                                   into failure_patterns in addition to
--                                   executive_memory_items.
--   routes/predictive/predictiveRisk.js — /critical and /emerging now
--                                   fetch graph_edges in-degree via
--                                   buildAgentInDegreeMap() and compute
--                                   adjustedScore = predicted_score + min(20,
--                                   inDegree*2). Both endpoints wrapped in
--                                   packageIntelligence().
-- ============================================================

-- Verify nothing is broken:
SELECT
  (SELECT COUNT(*) FROM failure_patterns)   AS failure_patterns_count,
  (SELECT COUNT(*) FROM system_events)      AS system_events_count,
  (SELECT COUNT(*) FROM module_capabilities) AS module_capabilities_count,
  (SELECT COUNT(*) FROM graph_edges)        AS graph_edges_count;

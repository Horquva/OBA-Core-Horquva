-- =============================================================================
-- Horquva Continuity Platform — Migration 008: accountability layer
-- =============================================================================
-- Additive groundwork for AI-key ownership and leaver detection:
-- - edge.owner_kind says how an 'owns' edge was established (the named owner,
--   the principal a vendor key belongs to, its creator, or a sponsor);
-- - prediction_ledger rows can name the departure that produced them;
-- - the ai_admin connector used to land vendor model catalogues as entities.
--   Those are noise (a catalogue, not usage), so the ones nothing refers to
--   are removed. A model with any edge, fact, attestation task or prediction
--   stays: something real points at it.
-- =============================================================================

ALTER TABLE edge ADD COLUMN IF NOT EXISTS owner_kind VARCHAR(16);

ALTER TABLE prediction_ledger ADD COLUMN IF NOT EXISTS departure_id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_prediction_departure ON prediction_ledger(departure_id);
-- 006 already rewrote this default; restated so the ledger never depends on uuid-ossp.
ALTER TABLE prediction_ledger ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- ai_admin wrote externalId = the model id and entity id 'model:<vendor>:<model id>'.
DELETE FROM entity e
 WHERE e.kind = 'model'
   AND EXISTS (
         SELECT 1 FROM raw_payload r
          WHERE (r.resource_type = 'openai_model' AND e.id = 'model:openai:' || r.external_id)
             OR (r.resource_type = 'anthropic_model' AND e.id = 'model:anthropic:' || r.external_id)
       )
   AND NOT EXISTS (SELECT 1 FROM edge WHERE from_id = e.id OR to_id = e.id)
   AND NOT EXISTS (SELECT 1 FROM fact WHERE entity_id = e.id)
   AND NOT EXISTS (SELECT 1 FROM attestation_task WHERE asset_entity_id = e.id)
   AND NOT EXISTS (SELECT 1 FROM prediction_ledger WHERE target_entity_id = e.id);

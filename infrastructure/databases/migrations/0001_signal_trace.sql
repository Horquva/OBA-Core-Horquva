-- 0001_signal_trace
--
-- Owner: Affan (integration).
--
-- The trace substrate for the envelope defined in
-- applications/executive_workspace/integration/contracts/ENVELOPE.md
--
-- Every hop writes one row on entry and updates it on exit. This table is
-- how "where did the signal stop?" is answered with a single query, and it
-- is the trace evidence artifact for the T1 gate.
--
-- This table holds no domain data. Evidence, claims, beliefs and entities
-- are defined by their owners in their own migrations.

CREATE TABLE IF NOT EXISTS signal_trace (
  id          bigserial   PRIMARY KEY,

  -- Envelope. Assigned at ingestion, never regenerated.
  signal_id   uuid        NOT NULL,
  hop         text        NOT NULL,

  -- Timing.
  entered_at  timestamptz NOT NULL DEFAULT now(),
  exited_at   timestamptz,

  -- Outcome of this hop.
  --   in_progress : entered, not yet finished
  --   ok          : passed downstream
  --   failed      : stopped here, see detail
  status      text        NOT NULL DEFAULT 'in_progress'
                          CHECK (status IN ('in_progress', 'ok', 'failed')),
  detail      text,

  -- Envelope fields carried for querying without joins.
  source          text,
  classification  text,
  schema_version  text
);

CREATE INDEX IF NOT EXISTS signal_trace_signal_id_idx
  ON signal_trace (signal_id, entered_at);

CREATE INDEX IF NOT EXISTS signal_trace_failed_idx
  ON signal_trace (hop, entered_at)
  WHERE status = 'failed';

COMMENT ON TABLE signal_trace IS
  'One row per hop per signal. Integration-owned. Carries no domain data.';

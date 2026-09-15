-- W-L migration 15: agent conversation, audit and usage tables.
-- Task 10.5 — Data, migration and persistence (Mushtaq Ahmed)
--
-- Design notes (§9.2):
--   • provider_calls is tracked separately from turns — on the free tier,
--     requests/day is the real throttle and one turn can cost several calls.
--   • content stores the full provider-shaped message array (not just text) —
--     the next turn needs that shape and validators depend on it.
--   • result_summary stores headline fields only, not the full payload —
--     large results (e.g. rank_scenarios) would otherwise bloat the table.
--
-- Rollback (safe — no organisational table touched):
--   DROP TABLE IF EXISTS agent_usage        CASCADE;
--   DROP TABLE IF EXISTS agent_tool_calls   CASCADE;
--   DROP TABLE IF EXISTS agent_messages     CASCADE;
--   DROP TABLE IF EXISTS agent_conversations CASCADE;

-- ── 1. Conversations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         text        NOT NULL,
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  archived        boolean     NOT NULL DEFAULT false
);

-- ── 2. Messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_messages (
  id              bigserial   PRIMARY KEY,
  conversation_id uuid        NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  turn            integer     NOT NULL,
  role            text        NOT NULL CHECK (role IN ('user','assistant')),
  content         jsonb       NOT NULL,
  snapshot_at     timestamptz,
  graph_loaded_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Tool calls (one row per tool invocation inside a turn) ────────────────
CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id              bigserial   PRIMARY KEY,
  message_id      bigint      NOT NULL REFERENCES agent_messages(id) ON DELETE CASCADE,
  tool_name       text        NOT NULL,
  input           jsonb       NOT NULL,
  result_summary  jsonb       NOT NULL,
  duration_ms     integer,
  error           text
);

-- ── 4. Usage / billing audit ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_usage (
  id               bigserial   PRIMARY KEY,
  conversation_id  uuid        REFERENCES agent_conversations(id) ON DELETE SET NULL,
  user_id          text        NOT NULL,
  provider         text        NOT NULL,
  model            text        NOT NULL,
  input_tokens     integer     NOT NULL DEFAULT 0,
  output_tokens    integer     NOT NULL DEFAULT 0,
  provider_calls   integer     NOT NULL DEFAULT 0,
  tool_iterations  integer     NOT NULL DEFAULT 0,
  validator_status text        CHECK (validator_status IN ('clean','repaired','flagged')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_agent_conv_user  ON agent_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_msg_conv   ON agent_messages(conversation_id, turn);
CREATE INDEX IF NOT EXISTS idx_agent_tool_msg   ON agent_tool_calls(message_id);
CREATE INDEX IF NOT EXISTS idx_agent_usage_user ON agent_usage(user_id, created_at DESC);

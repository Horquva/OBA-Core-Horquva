-- =============================================================================
-- Horquva Continuity Platform — Migration 007: Ask OBA conversations on Postgres
-- =============================================================================
-- Each signed-in user's Ask OBA history moves out of process memory so it
-- survives restarts and deploys. Conversations belong to one user; deleting
-- the user or the conversation removes its messages.
-- =============================================================================

CREATE TABLE IF NOT EXISTS assistant_conversation (
    id UUID PRIMARY KEY,
    owner_user_id VARCHAR(128) NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversation_owner
    ON assistant_conversation(owner_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS assistant_message (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES assistant_conversation(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]',
    answered_by VARCHAR(16) CHECK (answered_by IN ('ai', 'graph')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_message_conversation
    ON assistant_message(conversation_id, created_at);

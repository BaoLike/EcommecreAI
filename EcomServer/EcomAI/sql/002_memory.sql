-- Persistent assistant conversation history and explicitly saved user memories.
-- Run once against the database configured by AI_MEMORY_DATABASE_URL.

CREATE TABLE IF NOT EXISTS ai_chat_threads (
    id              uuid PRIMARY KEY,
    owner_user_id   text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    expires_at      timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS ai_chat_threads_expiry_idx
    ON ai_chat_threads (expires_at);
CREATE INDEX IF NOT EXISTS ai_chat_threads_owner_idx
    ON ai_chat_threads (owner_user_id, updated_at DESC)
    WHERE owner_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id          bigserial PRIMARY KEY,
    thread_id   uuid NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('user', 'assistant')),
    content     text NOT NULL CHECK (char_length(content) <= 4000),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_thread_idx
    ON ai_chat_messages (thread_id, id DESC);

-- Structured short-term shopping state is separate from raw conversation history.
CREATE TABLE IF NOT EXISTS ai_chat_state (
    thread_id   uuid PRIMARY KEY REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
    state       jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_user_memories (
    id                  uuid PRIMARY KEY,
    user_id             text NOT NULL,
    content             text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
    source_thread_id    uuid REFERENCES ai_chat_threads(id) ON DELETE SET NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_user_memories_user_idx
    ON ai_user_memories (user_id, updated_at DESC);

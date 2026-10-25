\set ON_ERROR_STOP on

-- Persistent knowledge base for hybrid full-text and vector retrieval.
-- Apply this migration to the database configured by AI_RAG_DATABASE_URL.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
    id          text PRIMARY KEY,
    title       text NOT NULL,
    sha256      text NOT NULL,
    demo_data   boolean NOT NULL DEFAULT false,
    status      text NOT NULL DEFAULT 'draft',
    version     integer NOT NULL DEFAULT 1,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Keep the migration safe for databases created by earlier RAG schema drafts.
ALTER TABLE ai_knowledge_documents
    ADD COLUMN IF NOT EXISTS demo_data boolean NOT NULL DEFAULT false;
ALTER TABLE ai_knowledge_documents
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE ai_knowledge_documents
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE ai_knowledge_documents
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE ai_knowledge_documents
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Legacy documents stay drafts until a store owner explicitly approves them.
UPDATE ai_knowledge_documents
   SET status = 'draft'
 WHERE status IS NULL OR status NOT IN ('approved', 'draft', 'archived');
UPDATE ai_knowledge_documents
   SET version = 1
 WHERE version IS NULL OR version < 1;

ALTER TABLE ai_knowledge_documents ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE ai_knowledge_documents ALTER COLUMN status SET NOT NULL;
ALTER TABLE ai_knowledge_documents ALTER COLUMN version SET DEFAULT 1;
ALTER TABLE ai_knowledge_documents ALTER COLUMN version SET NOT NULL;

DO $$
BEGIN
    ALTER TABLE ai_knowledge_documents
        ADD CONSTRAINT ai_knowledge_documents_status_check
        CHECK (status IN ('approved', 'draft', 'archived'));
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE ai_knowledge_documents
        ADD CONSTRAINT ai_knowledge_documents_version_check
        CHECK (version >= 1);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id          text PRIMARY KEY,
    document_id text NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
    heading     text NOT NULL,
    content     text NOT NULL,
    embedding   vector,
    content_tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED
);

CREATE INDEX IF NOT EXISTS ai_knowledge_chunks_document_idx
    ON ai_knowledge_chunks (document_id);
CREATE INDEX IF NOT EXISTS ai_knowledge_chunks_content_tsv_idx
    ON ai_knowledge_chunks USING gin (content_tsv);
CREATE INDEX IF NOT EXISTS ai_knowledge_documents_visibility_idx
    ON ai_knowledge_documents (status, demo_data);

# E-commerce AI Assistant

FastAPI service for grounded shopping assistance. The LangGraph workflow retrieves live Spring catalog data and relevant Markdown knowledge sources. It does not access orders, payments, or customer records.

## Local run

Requirements: Python 3.11 or newer and the Spring API running at `http://localhost:8080`.

```bash
cd EcomServer/EcomAI
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
set -a
source .env
set +a
uvicorn app.main:app --reload --port 8000
```

The app reads environment variables directly. The `.env.example` file is a template; the commands above load the copied `.env` into the process.

Open `http://localhost:8000/docs` for the request contract. Example:

```json
{
  "message": "Tư vấn laptop cho sinh viên dưới 20 triệu",
  "constraints": { "max_price": 20000000 }
}
```

`LLM_BASE_URL` and `LLM_MODEL` are optional. Configure an OpenAI-compatible provider to generate natural-language explanations; without them, the service returns a deterministic summary from retrieved evidence. `LLM_API_KEY` is optional for local providers such as Ollama.

## Knowledge RAG

The policy files in `knowledge_base/` are working versions and start with `status: draft`; the assistant excludes them before retrieval. Review the store-specific terms, then set `status: approved` and increment `version` in the file's front matter to publish it to retrieval. Do not approve a policy until its service timelines and conditions match the store's actual operations. Then rerun ingestion:

```yaml
---
status: approved
version: 1
---
```

Then rerun ingestion. `status: draft` and `status: archived` remain unavailable. Existing database documents are migrated as drafts, so they must be explicitly re-approved. Reapply `sql/001_rag.sql` to update an existing database schema; it is safe to rerun.

For persistent hybrid retrieval, configure PostgreSQL with pgvector and an OpenAI-compatible embeddings endpoint. Install pgvector on the PostgreSQL server itself, matching its major version. If Ubuntu cannot find the package in its default repositories, configure the official PostgreSQL APT repository first:

```bash
sudo apt install -y postgresql-common ca-certificates
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install postgresql-16-pgvector
```

Replace `16` with the PostgreSQL server's major version. Installing only the `psql` client is not sufficient. The current `Ecommerce` database may be used, but the database user needs permission to install the `vector` extension once. Set `AI_RAG_DATABASE_URL`, `EMBEDDING_BASE_URL`, `EMBEDDING_MODEL` and, if required, `EMBEDDING_API_KEY`, then apply the schema and ingest the documents. `EMBEDDING_TIMEOUT_SECONDS` defaults to 300 seconds to allow local models such as Ollama to load and generate embeddings:

```bash
psql "$AI_RAG_DATABASE_URL" -f sql/001_rag.sql
python -m app.ingest
```

At chat time, both PostgreSQL searches filter to approved, non-demo documents before retrieval. The service combines pgvector cosine search with PostgreSQL full-text search using reciprocal-rank fusion, followed by a lightweight lexical reranker. If the database or embedding endpoint is unavailable, it falls back to local Markdown search, which applies the same approval gate. Use the same embedding model for indexing and chat; rerun ingestion after changing the model or editing/deleting documents. The provided SQL keeps vectors dimension-flexible, so it uses exact vector scans; add a dimension-specific HNSW index after settling on a fixed embedding model and data size.

Responses include `references` with document ID, title, and section. The model is instructed to cite documents as `[S1]` and catalog items as `[P1]`; these are also shown below the answer in the React widget.

Set `VITE_AI_API_URL=http://localhost:8000` for the React development server. The Spring API must already contain products; its normal local database can be populated through the admin UI, or use the isolated demo profile and demo database described in the root `SECURITY_AND_DATA.md`.

## Current scope

- Product search and budget/category/brand constraints, using live Spring data.
- Only in-stock products are recommended. Availability currently uses the existing `Product.quantity > 0` field; the source project has no reservation or multi-warehouse stock model.
- Product sources and knowledge-document references are returned separately from generated text.
- Catalog and document contents are treated as untrusted context; the model has no business tools or access to order data.
- Conversation history is restored in the widget and expires after 30 days of inactivity. At most 200 messages are stored per conversation, and the graph receives the latest 12 messages as context. Structured shopping slots and recent products are stored separately in `ai_chat_state` as short-term conversation state.
- Long-term preferences are stored only when a signed-in user explicitly asks the assistant to remember them. Use “Bạn nhớ gì về tôi?” to review them and “Quên tất cả những gì đã ghi nhớ” to delete them. The widget also provides memory review, update, and deletion controls.
- Guest conversations require an unguessable browser-generated session capability in `X-Assistant-Session`; the AI service stores only its SHA-256-derived owner key. Authenticated threads and preferences are bound to Spring's verified stable user ID from the configured HttpOnly JWT cookie; the AI service does not accept a client-supplied user ID. Set `AI_IDENTITY_COOKIE_NAME` to the same cookie name as Spring's `JWT_COOKIE_NAME` (default `baolikeEcom`). Only that cookie is forwarded to the configured Spring identity endpoint.
- Pre-upgrade guest threads had no distinct owner key and are not auto-claimed by the new session; the widget starts a fresh guest thread after upgrading to preserve the ownership boundary.

## Conversation and user memory

Set `AI_MEMORY_DATABASE_URL` to a PostgreSQL database. It can share the `Ecommerce` database and may use the same URL as `AI_RAG_DATABASE_URL`. Apply the memory schema; reapply it after upgrading so existing deployments get the `ai_chat_state` table (the migration is idempotent):

```bash
psql "$AI_MEMORY_DATABASE_URL" -f sql/002_memory.sql
```

The React widget sends the browser cookie to the AI API for identity verification and `X-Assistant-Session` for guest ownership, so `AI_ALLOWED_ORIGINS` must list the exact storefront origin. Conversation records expire 30 days after the last turn; a cleanup task removes expired threads, messages, and short-term state. Each thread retains at most 200 messages, and the model receives at most the latest 12. The assistant keeps at most 20 saved preferences per account, deduplicates repeated saves, and lets the owner inspect, update, or delete them. It only writes long-term memory for explicit “remember” requests and rejects common credential/payment-secret patterns.

Memory endpoints:

- `GET /api/v1/assistant/conversations/{conversation_id}` restores a thread.
- `DELETE /api/v1/assistant/conversations/{conversation_id}` deletes a thread and its messages.
- `GET /api/v1/assistant/memory` lists the signed-in user's saved preferences.
- `DELETE /api/v1/assistant/memory` deletes the signed-in user's saved preferences.
- `DELETE /api/v1/assistant/memory/{memory_id}` deletes one saved preference.
- `PUT /api/v1/assistant/memory/{memory_id}` updates one saved preference, scoped to the verified user ID.

## Workflow and operations

LangGraph routes each turn to catalog retrieval, knowledge retrieval, both, or a direct response. Catalog errors surface as a service-unavailable response; RAG falls back to approved local Markdown; the LLM uses one bounded retry for transient transport/429/5xx failures and then a deterministic grounded response. Unexpected request failures return a sanitized error with a request ID. The graph does not use LangGraph checkpointing: turns are short, and conversation history plus shopping state are committed in PostgreSQL around each request. A later long-running workflow can add a checkpoint backend without changing the current memory tables.

`GET /metrics` exposes process-level HTTP/node/retrieval/provider-token counters. Structured JSON logs include request IDs and timings but omit message bodies, cookies, and authorization values. Counters are in-memory and reset on restart; use a durable metrics or tracing backend if you need cross-restart dashboards.

The labeled eval set and runner are in `evals/`. It reports route accuracy, structured-constraint accuracy, product/reference Recall@K, citation-validity proxy, completion, errors, latency, and provider-reported token deltas. Semantic groundedness still needs human review; citation validity alone is not a groundedness score. Evaluation product labels should match the catalog loaded for the target environment.

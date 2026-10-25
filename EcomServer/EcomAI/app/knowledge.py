"""Small, source-linked knowledge retrieval for approved shop documents.

When PostgreSQL is configured this module uses full-text search, and also uses
pgvector when an embedding provider is configured. Otherwise it uses a local
lexical retriever so the demo knowledge base works without extra services.
"""

import hashlib
import logging
import re
import unicodedata
from pathlib import Path
from typing import Any

import httpx

from app import settings

logger = logging.getLogger(__name__)
DEFAULT_KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge_base"
MAX_CHUNK_CHARS = 1100


def _knowledge_dir() -> Path:
    return Path(settings.KNOWLEDGE_DIR).expanduser() if settings.KNOWLEDGE_DIR else DEFAULT_KNOWLEDGE_DIR


def _normalize(text: str) -> str:
    value = unicodedata.normalize("NFD", text.lower())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return value.replace("đ", "d")


def _is_unapproved_text(text: str) -> bool:
    normalized = _normalize(text)
    return any(marker in normalized for marker in (
        "ban nhap", "chua duoc cua hang phe duyet", "noi dung mau phuc vu kiem thu",
        "minh hoa kha nang tim kiem tai lieu", "draft", "sample document",
    ))


def _is_publishable(chunk: dict[str, Any]) -> bool:
    return chunk.get("status") == "approved" and not chunk.get("demo_data") and not _is_unapproved_text(
        f"{chunk.get('title', '')}\n{chunk.get('content', '')}"
    )


def _document_metadata(raw: str) -> tuple[str, int, str]:
    """Read an explicit approval status and version from YAML front matter."""
    match = re.match(r"^\ufeff?---\s*\n(.*?)\n---\s*(?:\n|$)", raw, flags=re.DOTALL)
    if not match:
        return "draft", 1, raw

    fields: dict[str, str] = {}
    for line in match.group(1).splitlines():
        key, separator, value = line.partition(":")
        if separator:
            fields[key.strip().lower()] = value.strip().strip("\"'").lower()
    status = fields.get("status", "draft")
    if status not in {"approved", "draft", "archived"}:
        status = "draft"
    try:
        version = max(1, int(fields.get("version", "1")))
    except ValueError:
        version = 1
    return status, version, raw[match.end():]


def should_search_knowledge(message: str) -> bool:
    """Avoid injecting policy documents into ordinary product recommendations."""
    normalized = _normalize(message)
    topics = (
        "bao hanh", "doi tra", "chinh sach", "thanh toan", "giao hang", "van chuyen",
        "hoan tien", "don hang", "tra cuu", "quy dinh", "huong dan", "tai lieu", "ho so",
    )
    return any(topic in normalized for topic in topics)


def _chunk_document(path: Path, root: Path) -> list[dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    status, version, body = _document_metadata(raw)
    relative_path = path.relative_to(root).as_posix()
    title = path.stem.replace("_", " ").replace("-", " ").strip().title()
    demo_data = _is_unapproved_text(raw[:2000]) or "demo" in raw[:1000].lower()
    sections: list[tuple[str, list[str]]] = []
    heading = title
    paragraphs: list[str] = []
    for line in body.splitlines():
        clean = line.strip()
        match = re.match(r"^#{1,6}\s+(.+)$", clean)
        if match:
            if paragraphs:
                sections.append((heading, paragraphs))
                paragraphs = []
            heading = match.group(1).strip()
        elif not clean:
            if paragraphs and paragraphs[-1] != "":
                paragraphs.append("")
        else:
            paragraphs.append(clean)
    if paragraphs:
        sections.append((heading, paragraphs))

    chunks: list[dict[str, Any]] = []
    for section_heading, lines in sections:
        content_parts: list[str] = []
        current_size = 0
        for paragraph in "\n".join(lines).split("\n\n"):
            paragraph = paragraph.strip()
            if not paragraph:
                continue
            # Keep exceptionally long paragraphs bounded without dropping text.
            pieces = [paragraph[i:i + MAX_CHUNK_CHARS] for i in range(0, len(paragraph), MAX_CHUNK_CHARS)]
            for piece in pieces:
                if content_parts and current_size + len(piece) + 2 > MAX_CHUNK_CHARS:
                    content = f"{section_heading}\n{''.join(content_parts).strip()}"
                    chunks.append(_make_chunk(relative_path, title, section_heading, content, demo_data,
                                              status, version, len(chunks)))
                    content_parts, current_size = [], 0
                content_parts.append(piece + "\n\n")
                current_size += len(piece) + 2
        if content_parts:
            content = f"{section_heading}\n{''.join(content_parts).strip()}"
            chunks.append(_make_chunk(relative_path, title, section_heading, content, demo_data,
                                      status, version, len(chunks)))
    return chunks


def _make_chunk(
    path: str,
    title: str,
    heading: str,
    content: str,
    demo_data: bool,
    status: str,
    version: int,
    index: int,
) -> dict[str, Any]:
    chunk_id = hashlib.sha256(f"{path}\0{index}\0{content}".encode("utf-8")).hexdigest()
    return {
        "id": chunk_id,
        "document_id": path,
        "title": title,
        "heading": heading,
        "content": content[:MAX_CHUNK_CHARS + 160],
        "demo_data": demo_data,
        "status": status,
        "version": version,
    }


def load_local_chunks() -> list[dict[str, Any]]:
    root = _knowledge_dir()
    if not root.is_dir():
        return []
    documents = sorted(root.rglob("*.md"))
    chunks: list[dict[str, Any]] = []
    for path in documents:
        try:
            chunks.extend(_chunk_document(path, root))
        except (OSError, UnicodeError):
            logger.exception("Could not read knowledge document %s", path)
    return chunks


async def _embed(text: str) -> list[float] | None:
    if not (settings.EMBEDDING_BASE_URL and settings.EMBEDDING_MODEL):
        return None
    headers = {"Content-Type": "application/json"}
    if settings.EMBEDDING_API_KEY:
        headers["Authorization"] = f"Bearer {settings.EMBEDDING_API_KEY}"
    async with httpx.AsyncClient(timeout=settings.EMBEDDING_TIMEOUT_SECONDS) as client:
        response = await client.post(
            f"{settings.EMBEDDING_BASE_URL}/embeddings",
            headers=headers,
            json={"model": settings.EMBEDDING_MODEL, "input": text[:4000]},
        )
        response.raise_for_status()
        vector = response.json()["data"][0]["embedding"]
        if not isinstance(vector, list) or not vector:
            return None
        return [float(value) for value in vector]


def _local_search(query: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    terms = {term for term in re.findall(r"[a-z0-9]+", _normalize(query)) if len(term) > 1}
    if not terms:
        return []
    matches = []
    for chunk in chunks:
        if not _is_publishable(chunk):
            continue
        normalized_content = _normalize(chunk["content"])
        normalized_heading = _normalize(chunk["heading"])
        hits = sum(1 + (0.5 if term in normalized_heading else 0) for term in terms if term in normalized_content)
        if hits:
            candidate = {**chunk, "score": hits / len(terms)}
            matches.append(candidate)
    matches.sort(key=lambda item: (-item["score"], item["title"], item["heading"]))
    return matches[: settings.RAG_MAX_CHUNKS]


def _rerank(query: str, chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Apply a lightweight lexical rerank after hybrid reciprocal-rank fusion."""
    terms = {
        term for term in re.findall(r"[a-z0-9]+", _normalize(query))
        if len(term) > 2 and term not in {
            "the", "and", "for", "with", "what", "how", "does", "this", "that",
            "cua", "hang", "minh", "toi", "ban", "cho", "ve", "mot", "nhu",
            "nao", "gi", "co", "khong", "la", "cua", "duoc",
        }
    }
    if not terms:
        return chunks[: settings.RAG_MAX_CHUNKS]

    rescored = []
    for chunk in chunks:
        content = _normalize(f"{chunk.get('title', '')} {chunk.get('heading', '')} {chunk.get('content', '')}")
        matched = sum(1 for term in terms if term in content)
        heading = _normalize(str(chunk.get("heading") or ""))
        heading_matches = sum(1 for term in terms if term in heading)
        rerank_score = float(chunk.get("score") or 0) + 0.01 * matched / len(terms)
        rerank_score += 0.005 * heading_matches / len(terms)
        rescored.append(({**chunk, "score": rerank_score}, rerank_score))
    rescored.sort(key=lambda row: (-row[1], row[0].get("title", ""), row[0].get("heading", "")))
    return [item for item, _ in rescored[: settings.RAG_MAX_CHUNKS]]


async def _database_search(query: str) -> list[dict[str, Any]]:
    if not settings.AI_RAG_DATABASE_URL:
        return []

    import asyncpg
    from pgvector import Vector
    from pgvector.asyncpg import register_vector

    try:
        vector = await _embed(query)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        logger.warning("Embedding provider unavailable; using PostgreSQL full-text retrieval")
        vector = None
    conn = await asyncpg.connect(settings.AI_RAG_DATABASE_URL, timeout=settings.RAG_TIMEOUT_SECONDS)
    try:
        await register_vector(conn)
        semantic_rows = []
        if vector is not None:
            semantic_rows = await conn.fetch(
                """SELECT c.id, c.document_id, d.title, c.heading, c.content, d.demo_data,
                          d.status, d.version,
                          c.embedding <=> $1 AS distance
                   FROM ai_knowledge_chunks c
                   JOIN ai_knowledge_documents d ON d.id = c.document_id
                   WHERE d.status = 'approved' AND d.demo_data = false
                     AND c.embedding IS NOT NULL AND c.embedding <=> $1 <= 0.65
                   ORDER BY c.embedding <=> $1
                   LIMIT 12""",
                Vector(vector),
            )
        lexical_rows = await conn.fetch(
            """SELECT c.id, c.document_id, d.title, c.heading, c.content, d.demo_data,
                      d.status, d.version,
                      ts_rank_cd(c.content_tsv, plainto_tsquery('simple', $1)) AS rank
               FROM ai_knowledge_chunks c
               JOIN ai_knowledge_documents d ON d.id = c.document_id
               WHERE d.status = 'approved' AND d.demo_data = false
                 AND c.content_tsv @@ plainto_tsquery('simple', $1)
               ORDER BY rank DESC
               LIMIT 12""",
            query[:1200],
        )
    finally:
        await conn.close()

    # Reciprocal-rank fusion keeps score scales from the two retrieval methods comparable.
    fused: dict[str, dict[str, Any]] = {}
    for ranked_rows in (semantic_rows, lexical_rows):
        for rank, row in enumerate(ranked_rows, start=1):
            item = fused.setdefault(row["id"], {
                "id": row["id"], "document_id": row["document_id"], "title": row["title"],
                "heading": row["heading"], "content": row["content"], "demo_data": row["demo_data"],
                "status": row["status"], "version": row["version"],
                "score": 0.0,
            })
            item["score"] += 1 / (60 + rank)
    ranked = sorted(fused.values(), key=lambda item: item["score"], reverse=True)
    publishable = [item for item in ranked if _is_publishable(item)]
    return _rerank(query, publishable)


async def search_knowledge(query: str) -> list[dict[str, Any]]:
    """Return relevant chunks, preferring pgvector + FTS and falling back locally."""
    if not should_search_knowledge(query):
        return []
    if settings.AI_RAG_DATABASE_URL:
        try:
            results = await _database_search(query)
            if results:
                return results
        except Exception:
            logger.warning("Knowledge database unavailable; using local document search", exc_info=True)
    return _local_search(query, load_local_chunks())


async def _embed_for_ingest(text: str) -> list[float]:
    vector = await _embed(text)
    if vector is None:
        raise RuntimeError("Set EMBEDDING_BASE_URL and EMBEDDING_MODEL before indexing documents")
    return vector


async def ingest_documents() -> int:
    """Upsert local Markdown sources into PostgreSQL. Run after applying sql/001_rag.sql."""
    if not settings.AI_RAG_DATABASE_URL:
        raise RuntimeError("Set AI_RAG_DATABASE_URL before indexing documents")
    chunks = load_local_chunks()
    if not chunks:
        raise RuntimeError(f"No Markdown knowledge documents found in {_knowledge_dir()}")

    import asyncpg
    from pgvector import Vector
    from pgvector.asyncpg import register_vector

    root = _knowledge_dir()
    prepared = [(chunk, Vector(await _embed_for_ingest(chunk["content"]))) for chunk in chunks]
    conn = await asyncpg.connect(settings.AI_RAG_DATABASE_URL, timeout=settings.RAG_TIMEOUT_SECONDS)
    try:
        await register_vector(conn)
        documents: dict[str, dict[str, Any]] = {}
        for chunk in chunks:
            doc_path = root / chunk["document_id"]
            raw = doc_path.read_bytes()
            documents[chunk["document_id"]] = {
                "title": chunk["title"],
                "sha256": hashlib.sha256(raw).hexdigest(),
                "demo_data": chunk["demo_data"],
                "status": chunk["status"],
                "version": chunk["version"],
            }

        async with conn.transaction():
            for document_id, document in documents.items():
                await conn.execute(
                    """INSERT INTO ai_knowledge_documents
                           (id, title, sha256, demo_data, status, version, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, now())
                       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title,
                         sha256 = EXCLUDED.sha256, demo_data = EXCLUDED.demo_data,
                         status = EXCLUDED.status, version = EXCLUDED.version, updated_at = now()""",
                    document_id, document["title"], document["sha256"], document["demo_data"],
                    document["status"], document["version"],
                )
                await conn.execute("DELETE FROM ai_knowledge_chunks WHERE document_id = $1", document_id)

            for chunk, embedding in prepared:
                await conn.execute(
                    """INSERT INTO ai_knowledge_chunks (id, document_id, heading, content, embedding)
                       VALUES ($1, $2, $3, $4, $5)""",
                    chunk["id"], chunk["document_id"], chunk["heading"], chunk["content"], embedding,
                )
            await conn.execute(
                "DELETE FROM ai_knowledge_documents WHERE NOT (id = ANY($1::text[]))",
                list(documents),
            )
    finally:
        await conn.close()
    return len(chunks)

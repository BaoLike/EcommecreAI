"""Persistence and identity helpers for assistant conversation memory."""

import hashlib
import json
import re
import unicodedata
from contextlib import asynccontextmanager
from dataclasses import dataclass
from http.cookies import CookieError, SimpleCookie
from typing import Any, AsyncIterator
from uuid import UUID, uuid4

import asyncpg
import httpx

from app import settings

MAX_STORED_MESSAGES_PER_CONVERSATION = 200


class MemoryStoreUnavailable(RuntimeError):
    pass


class ConversationAccessDenied(RuntimeError):
    pass


class IdentityServiceUnavailable(RuntimeError):
    pass


@dataclass(frozen=True)
class VerifiedIdentity:
    user_id: str
    username: str


def _database_url() -> str:
    url = settings.AI_MEMORY_DATABASE_URL or settings.AI_RAG_DATABASE_URL
    if not url:
        raise MemoryStoreUnavailable(
            "Assistant memory database is not configured; set AI_MEMORY_DATABASE_URL."
        )
    return url


async def resolve_user_identity(cookie_header: str | None) -> VerifiedIdentity | None:
    """Ask Spring to validate only its configured HttpOnly JWT cookie."""
    if not cookie_header:
        return None

    parsed_cookies = SimpleCookie()
    try:
        parsed_cookies.load(cookie_header)
    except (CookieError, TypeError, ValueError):
        return None
    jwt_cookie = parsed_cookies.get(settings.IDENTITY_COOKIE_NAME)
    if jwt_cookie is None or not jwt_cookie.value:
        return None

    try:
        async with httpx.AsyncClient(timeout=settings.IDENTITY_TIMEOUT_SECONDS) as client:
            response = await client.get(
                f"{settings.IDENTITY_API_URL}/auth/assistant-identity",
                headers={"Cookie": f"{settings.IDENTITY_COOKIE_NAME}={jwt_cookie.value}"},
            )
    except httpx.HTTPError as exc:
        raise IdentityServiceUnavailable("Could not verify the signed-in account.") from exc

    if response.status_code in (401, 403):
        return None
    try:
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise IdentityServiceUnavailable("Could not verify the signed-in account.") from exc

    try:
        payload = response.json()
        user_id = str(payload["user_id"]).strip()
        username = str(payload["username"]).strip()
    except (ValueError, KeyError, TypeError) as exc:
        raise IdentityServiceUnavailable("Spring returned an invalid verified identity.") from exc
    if not user_id.isdigit() or int(user_id) < 1 or not username:
        raise IdentityServiceUnavailable("Spring returned an incomplete verified identity.")
    return VerifiedIdentity(user_id=user_id, username=username)


def guest_owner_id(session_id: str | None) -> str | None:
    """Derive an opaque DB owner key from a browser-held guest capability."""
    if not session_id:
        return None
    try:
        parsed = UUID(session_id)
    except (ValueError, TypeError, AttributeError):
        return None
    if parsed.version != 4:
        return None
    digest = hashlib.sha256(parsed.bytes).hexdigest()
    return f"guest:{digest}"


@asynccontextmanager
async def locked_conversation(
    conversation_id: UUID,
    owner_user_id: str | None,
    legacy_owner_user_id: str | None = None,
) -> AsyncIterator[asyncpg.Connection]:
    """Serialize turns for one conversation and enforce its owner boundary."""
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc

    lock_key = str(conversation_id)
    locked = False
    try:
        await conn.execute("SELECT pg_advisory_lock(hashtextextended($1, 0))", lock_key)
        locked = True
        async with conn.transaction():
            row = await conn.fetchrow(
                """SELECT owner_user_id, expires_at <= now() AS expired
                   FROM ai_chat_threads WHERE id = $1 FOR UPDATE""",
                conversation_id,
            )
            if row and row["expired"]:
                await conn.execute("DELETE FROM ai_chat_threads WHERE id = $1", conversation_id)
                row = None

            # Older versions stored the verified username. Upgrade this thread
            # only after Spring has verified that same username from the JWT.
            if (
                row
                and owner_user_id
                and legacy_owner_user_id
                and row["owner_user_id"] == legacy_owner_user_id
                and owner_user_id != legacy_owner_user_id
            ):
                await conn.execute(
                    "UPDATE ai_chat_threads SET owner_user_id = $1 WHERE id = $2",
                    owner_user_id,
                    conversation_id,
                )
                row_owner_user_id = owner_user_id
            else:
                row_owner_user_id = row["owner_user_id"] if row else None

            if row is None:
                await conn.execute(
                    "INSERT INTO ai_chat_threads (id, owner_user_id) VALUES ($1, $2)",
                    conversation_id,
                    owner_user_id,
                )
            elif row_owner_user_id != owner_user_id:
                raise ConversationAccessDenied("Conversation not found.")

            await conn.execute(
                """UPDATE ai_chat_threads
                   SET updated_at = now(), expires_at = now() + interval '30 days'
                   WHERE id = $1""",
                conversation_id,
            )
        yield conn
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc
    finally:
        if locked:
            try:
                await conn.execute("SELECT pg_advisory_unlock(hashtextextended($1, 0))", lock_key)
            except asyncpg.PostgresError:
                pass
        await conn.close()


async def conversation_history(
    conn: asyncpg.Connection,
    conversation_id: UUID,
    limit: int = 12,
) -> list[dict[str, str]]:
    rows = await conn.fetch(
        """SELECT role, content FROM (
               SELECT id, role, content FROM ai_chat_messages
               WHERE thread_id = $1 ORDER BY id DESC LIMIT $2
           ) recent ORDER BY id ASC""",
        conversation_id,
        limit,
    )
    return [{"role": row["role"], "content": row["content"]} for row in rows]


async def load_conversation_state(
    conn: asyncpg.Connection,
    conversation_id: UUID,
) -> dict[str, Any]:
    row = await conn.fetchrow("SELECT state FROM ai_chat_state WHERE thread_id = $1", conversation_id)
    if row is None:
        return {}
    raw_state = row["state"]
    if isinstance(raw_state, str):
        try:
            decoded = json.loads(raw_state)
        except json.JSONDecodeError:
            return {}
    else:
        decoded = raw_state
    return decoded if isinstance(decoded, dict) else {}


async def save_conversation_state(
    conn: asyncpg.Connection,
    conversation_id: UUID,
    state: dict[str, Any],
) -> None:
    await conn.execute(
        """INSERT INTO ai_chat_state (thread_id, state, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (thread_id) DO UPDATE
           SET state = EXCLUDED.state, updated_at = now()""",
        conversation_id,
        json.dumps(state, ensure_ascii=False),
    )


async def record_turn(
    conn: asyncpg.Connection,
    conversation_id: UUID,
    user_message: str,
    assistant_message: str,
) -> None:
    async with conn.transaction():
        await conn.executemany(
            """INSERT INTO ai_chat_messages (thread_id, role, content)
               VALUES ($1, $2, $3)""",
            [
                (conversation_id, "user", user_message[:1200]),
                (conversation_id, "assistant", assistant_message[:4000]),
            ],
        )
        await conn.execute(
            """DELETE FROM ai_chat_messages
               WHERE thread_id = $1
                 AND id NOT IN (
                     SELECT id FROM ai_chat_messages
                     WHERE thread_id = $1 ORDER BY id DESC LIMIT $2
                 )""",
            conversation_id,
            MAX_STORED_MESSAGES_PER_CONVERSATION,
        )
        await conn.execute("UPDATE ai_chat_threads SET updated_at = now() WHERE id = $1", conversation_id)


async def load_user_memories(
    conn: asyncpg.Connection,
    user_id: str | None,
    legacy_username: str | None = None,
) -> list[str]:
    if not user_id:
        return []
    await _upgrade_legacy_memories(conn, user_id, legacy_username)
    rows = await conn.fetch(
        """SELECT content FROM ai_user_memories
           WHERE user_id = $1
           ORDER BY updated_at DESC, created_at DESC, id DESC LIMIT 8""",
        user_id,
    )
    return [row["content"] for row in rows]


async def _upgrade_legacy_memories(
    conn: asyncpg.Connection,
    user_id: str,
    legacy_username: str | None,
) -> None:
    if legacy_username and legacy_username != user_id:
        # Upgrade records created before IDs were used as the memory key,
        # after the account was verified by Spring on this request.
        await conn.execute(
            "UPDATE ai_user_memories SET user_id = $1 WHERE user_id = $2",
            user_id,
            legacy_username,
        )


async def add_user_memory(
    conn: asyncpg.Connection,
    user_id: str,
    conversation_id: UUID,
    content: str,
) -> None:
    async with conn.transaction():
        existing = await conn.fetchval(
            """SELECT id FROM ai_user_memories
               WHERE user_id = $1 AND lower(content) = lower($2)
               ORDER BY updated_at DESC LIMIT 1""",
            user_id,
            content[:500],
        )
        if existing:
            await conn.execute(
                "UPDATE ai_user_memories SET updated_at = now() WHERE id = $1",
                existing,
            )
            return
        await conn.execute(
            """INSERT INTO ai_user_memories (id, user_id, content, source_thread_id)
               VALUES ($1, $2, $3, $4)""",
            uuid4(),
            user_id,
            content[:500],
            conversation_id,
        )
        await conn.execute(
            """DELETE FROM ai_user_memories
               WHERE user_id = $1 AND id IN (
                   SELECT id FROM ai_user_memories WHERE user_id = $1
                   ORDER BY updated_at DESC, created_at DESC, id DESC OFFSET 20
               )""",
            user_id,
        )


async def update_user_memory(
    user_id: str,
    memory_id: UUID,
    content: str,
    legacy_username: str | None = None,
) -> bool:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            await _upgrade_legacy_memories(conn, user_id, legacy_username)
            result = await conn.execute(
                """UPDATE ai_user_memories SET content = $3, updated_at = now()
                   WHERE user_id = $1 AND id = $2""",
                user_id,
                memory_id,
                content[:500],
            )
            return result.endswith("1")
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


async def list_user_memories(
    user_id: str,
    legacy_username: str | None = None,
) -> list[dict[str, Any]]:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            await _upgrade_legacy_memories(conn, user_id, legacy_username)
            rows = await conn.fetch(
                """SELECT id, content, created_at FROM ai_user_memories
                   WHERE user_id = $1
                   ORDER BY updated_at DESC, created_at DESC, id DESC LIMIT 20""",
                user_id,
            )
            return [
                {"id": str(row["id"]), "content": row["content"], "created_at": row["created_at"].isoformat()}
                for row in rows
            ]
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


async def delete_user_memories(user_id: str, legacy_username: str | None = None) -> int:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            await _upgrade_legacy_memories(conn, user_id, legacy_username)
            result = await conn.execute("DELETE FROM ai_user_memories WHERE user_id = $1", user_id)
            return int(result.rsplit(" ", 1)[-1])
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


async def delete_user_memory(
    user_id: str,
    memory_id: UUID,
    legacy_username: str | None = None,
) -> bool:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            await _upgrade_legacy_memories(conn, user_id, legacy_username)
            result = await conn.execute(
                "DELETE FROM ai_user_memories WHERE user_id = $1 AND id = $2",
                user_id,
                memory_id,
            )
            return result.endswith("1")
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


async def delete_conversation(
    conversation_id: UUID,
    owner_user_id: str | None,
    legacy_owner_user_id: str | None = None,
) -> bool:
    async with locked_conversation(conversation_id, owner_user_id, legacy_owner_user_id) as conn:
        result = await conn.execute("DELETE FROM ai_chat_threads WHERE id = $1", conversation_id)
        return result.endswith("1")


async def load_conversation(
    conversation_id: UUID,
    owner_user_id: str | None,
    legacy_owner_user_id: str | None = None,
) -> list[dict[str, str]]:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            row = await conn.fetchrow(
                """SELECT owner_user_id FROM ai_chat_threads
                   WHERE id = $1 AND expires_at > now()""",
                conversation_id,
            )
            if row is None:
                return []
            if (
                owner_user_id
                and legacy_owner_user_id
                and row["owner_user_id"] == legacy_owner_user_id
                and owner_user_id != legacy_owner_user_id
            ):
                await conn.execute(
                    "UPDATE ai_chat_threads SET owner_user_id = $1 WHERE id = $2",
                    owner_user_id,
                    conversation_id,
                )
                row_owner_user_id = owner_user_id
            else:
                row_owner_user_id = row["owner_user_id"]
            if row_owner_user_id != owner_user_id:
                raise ConversationAccessDenied("Conversation not found.")
            return await conversation_history(conn, conversation_id, limit=40)
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


async def cleanup_expired_conversations() -> int:
    try:
        conn = await asyncpg.connect(_database_url(), timeout=settings.MEMORY_TIMEOUT_SECONDS)
        try:
            result = await conn.execute("DELETE FROM ai_chat_threads WHERE expires_at <= now()")
            return int(result.rsplit(" ", 1)[-1])
        finally:
            await conn.close()
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        raise MemoryStoreUnavailable("Assistant memory database is unavailable.") from exc


def memory_command(message: str) -> tuple[str, str | None] | None:
    """Recognize explicit memory controls; never infer or silently save facts."""
    normalized = unicodedata.normalize("NFD", message.lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d")

    if any(phrase in normalized for phrase in (
        "quen tat ca", "xoa ghi nho", "xoa het ghi nho", "xoa thong tin da luu",
        "forget everything", "forget all memories", "delete my memories",
    )):
        return ("forget", None)
    if any(phrase in normalized for phrase in (
        "ban nho gi ve toi", "ban dang nho gi", "toi da bao ban nho gi",
        "what do you remember about me", "show my memories",
    )):
        return ("list", None)

    patterns = (
        r"^\s*(?:hãy\s+)?ghi\s+nhớ\s+(?:rằng\s+|là\s+)?(.+)$",
        r"^\s*hãy\s+nhớ\s+(?:rằng\s+|là\s+)?(.+)$",
        r"^\s*nhớ\s+giúp(?:\s+(?:mình|tôi))?\s*(?:rằng\s+|là\s+)?(.+)$",
    )
    for pattern in patterns:
        match = re.match(pattern, message, flags=re.IGNORECASE)
        if match:
            content = match.group(1).strip(" \t.,!?;:")
            if content:
                return ("save", content[:500])
    return None


def contains_sensitive_memory(content: str) -> bool:
    normalized = unicodedata.normalize("NFD", content.lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d")
    sensitive_terms = (
        "mat khau", "password", "passphrase", "otp", "one time password", "security code",
        "ma xac thuc", "cvv", "cvc", "ma pin", "pin code", "so the", "the tin dung",
        "credit card", "debit card", "card number", "so tai khoan", "account number",
        "bank account", "routing number", "can cuoc", "cccd", "cmnd", "passport",
        "so ho chieu", "national id", "social security", "ssn", "api key", "secret key",
        "private key", "phone number", "so dien thoai", "email address", "dia chi nha",
        "home address", "date of birth", "ngay sinh", "sensitive personal",
    )
    return any(term in normalized for term in sensitive_terms)

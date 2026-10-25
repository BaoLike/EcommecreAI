import asyncio
import logging
import unicodedata
from contextlib import asynccontextmanager, suppress
from time import perf_counter
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app import settings
from app.agent import assistant_graph
from app.catalog import CatalogUnavailable, infer_shopping_constraints
from app.memory import (
    ConversationAccessDenied,
    IdentityServiceUnavailable,
    MemoryStoreUnavailable,
    VerifiedIdentity,
    add_user_memory,
    cleanup_expired_conversations,
    contains_sensitive_memory,
    conversation_history,
    delete_conversation,
    delete_user_memory,
    delete_user_memories,
    guest_owner_id,
    list_user_memories,
    load_conversation_state,
    load_conversation,
    load_user_memories,
    locked_conversation,
    memory_command,
    record_turn,
    resolve_user_identity,
    save_conversation_state,
    update_user_memory,
)
from app.observability import log_event, prometheus_metrics, record_http
from app.schemas import AssistantRequest, AssistantResponse, KnowledgeReference, MemoryUpdateRequest, ProductSource

logger = logging.getLogger(__name__)


async def _memory_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(3600)
        try:
            await cleanup_expired_conversations()
        except MemoryStoreUnavailable:
            logger.warning("Could not clean expired assistant conversations.", exc_info=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    cleanup_task = asyncio.create_task(_memory_cleanup_loop())
    try:
        yield
    finally:
        cleanup_task.cancel()
        with suppress(asyncio.CancelledError):
            await cleanup_task


app = FastAPI(
    title="E-commerce AI Assistant",
    version="0.2.0",
    description="Shopping assistant backed by the Spring product catalog.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Assistant-Session"],
)


@app.middleware("http")
async def observe_request(request: Request, call_next):
    try:
        trace_id = str(UUID(request.headers.get("x-request-id", "")))
    except (ValueError, TypeError):
        trace_id = str(uuid4())
    request.state.trace_id = trace_id
    started = perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = trace_id
        return response
    finally:
        duration = perf_counter() - started
        route = getattr(request.scope.get("route"), "path", "unmatched")
        record_http(request.method, route, status, duration)
        log_event(
            "http_request_complete",
            trace_id=trace_id,
            method=request.method,
            route=route,
            status=status,
            duration_ms=round(duration * 1000, 2),
        )


def _contextual_query(message: str, history: list[dict[str, str]]) -> str:
    recent_requests = [item["content"] for item in history if item.get("role") == "user"][-4:]
    parts = recent_requests + [message]
    return "\n".join(part[:500] for part in parts if part.strip())[:3000]


def _merge_shopping_constraints(
    message: str,
    saved_state: dict,
    explicit_constraints: dict,
) -> dict:
    constraints = dict(saved_state.get("shopping_constraints") or {})
    normalized = unicodedata.normalize("NFD", message.lower())
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn").replace("đ", "d")
    if any(phrase in normalized for phrase in (
        "khong gioi han ngan sach", "khong can gioi han gia", "bo loc gia", "khong quan tam gia",
    )):
        constraints.pop("max_price", None)
        constraints["clear_max_price"] = True

    constraints.update(infer_shopping_constraints(message))
    for key in ("category", "brand", "max_price"):
        if explicit_constraints.get(key) is not None:
            constraints[key] = explicit_constraints[key]
    return constraints


def _update_short_term_state(
    current_state: dict,
    constraints: dict,
    result: dict,
) -> dict:
    updated = dict(current_state)
    if constraints:
        updated["shopping_constraints"] = {
            key: value for key, value in constraints.items()
            if key in {"category", "brand", "max_price"}
        }
    recent_products = result.get("products") or result.get("alternatives") or []
    if recent_products:
        updated["recent_products"] = [
            {
                "product_id": item.get("productId"),
                "name": str(item.get("productName") or "")[:160],
                "price": item.get("specialPrice", item.get("price")),
            }
            for item in recent_products[:5]
        ]
    return updated


async def _resolved_user_identity(request: Request):
    try:
        return await resolve_user_identity(request.headers.get("cookie"))
    except IdentityServiceUnavailable as exc:
        log_event(
            "identity_verification_failed",
            trace_id=getattr(request.state, "trace_id", None),
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=503, detail=str(exc)) from exc


async def _conversation_owner(
    request: Request,
) -> tuple[str, str | None, VerifiedIdentity | None]:
    identity = await _resolved_user_identity(request)
    if identity:
        return identity.user_id, identity.username, identity
    guest_id = guest_owner_id(request.headers.get("x-assistant-session"))
    if not guest_id:
        raise HTTPException(
            status_code=401,
            detail="A valid assistant browser session or signed-in account is required.",
        )
    return guest_id, None, None


def _memory_response_text(memories: list[str]) -> str:
    if not memories:
        return "Mình chưa lưu sở thích nào cho tài khoản này. Bạn có thể nói ‘Hãy nhớ rằng…’ để lưu một sở thích mua sắm."
    return "Mình đang ghi nhớ:\n" + "\n".join(f"• {item}" for item in memories)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    return Response(
        content=prometheus_metrics(),
        media_type="text/plain; version=0.0.4; charset=utf-8",
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    if isinstance(exc, StarletteHTTPException):
        return await http_exception_handler(request, exc)
    if isinstance(exc, RequestValidationError):
        return await request_validation_exception_handler(request, exc)
    trace_id = getattr(request.state, "trace_id", None)
    log_event(
        "request_failed",
        trace_id=trace_id,
        method=request.method,
        route=getattr(request.scope.get("route"), "path", "unmatched"),
        error_type=type(exc).__name__,
    )
    return JSONResponse(
        status_code=502,
        content={"detail": "Assistant service encountered an internal error.", "request_id": trace_id},
    )


@app.post("/api/v1/assistant/chat", response_model=AssistantResponse)
async def chat(request: AssistantRequest, http_request: Request) -> AssistantResponse:
    result: dict = {}
    try:
        owner_id, username, identity = await _conversation_owner(http_request)
        user_id = identity.user_id if identity else None
        async with locked_conversation(request.conversation_id, owner_id, username) as conn:
            history = await conversation_history(conn, request.conversation_id)
            short_term_state = await load_conversation_state(conn, request.conversation_id)
            memories = await load_user_memories(conn, user_id, username)
            explicit_constraints = request.constraints.model_dump(exclude_none=True)
            constraints = _merge_shopping_constraints(request.message, short_term_state, explicit_constraints)
            active_short_term_state = {
                **short_term_state,
                "shopping_constraints": {
                    key: value for key, value in constraints.items()
                    if key in {"category", "brand", "max_price"}
                },
            }
            command = memory_command(request.message)

            if command and command[0] == "save":
                content = command[1] or ""
                if user_id is None:
                    answer = "Bạn cần đăng nhập để lưu sở thích và dùng lại trong các cuộc trò chuyện sau."
                elif contains_sensitive_memory(content):
                    answer = "Mình không lưu mật khẩu, mã xác thực, thông tin thẻ hoặc dữ liệu định danh nhạy cảm."
                else:
                    await add_user_memory(conn, user_id, request.conversation_id, content)
                    answer = f"Mình đã lưu sở thích: {content}"
            elif command and command[0] == "forget":
                if user_id is None:
                    answer = "Bạn cần đăng nhập để xóa các sở thích đã lưu cho tài khoản."
                else:
                    deleted_count = await delete_user_memories(user_id)
                    memories = []
                    answer = f"Mình đã xóa {deleted_count} sở thích đã lưu."
            elif command and command[0] == "list":
                if user_id is None:
                    answer = "Đăng nhập để xem sở thích đã lưu cho tài khoản của bạn."
                else:
                    answer = _memory_response_text(memories)
            else:
                result = await assistant_graph.ainvoke({
                    "message": request.message,
                    "contextual_message": _contextual_query(request.message, history),
                    "constraints": constraints,
                    "history": history,
                    "user_memories": memories,
                    "conversation_state": active_short_term_state,
                    "trace_id": http_request.state.trace_id,
                })
                answer = result.get("answer", "Mình chưa tạo được câu trả lời.")
                await save_conversation_state(
                    conn,
                    request.conversation_id,
                    _update_short_term_state(short_term_state, constraints, result),
                )

            await record_turn(conn, request.conversation_id, request.message, answer)
    except CatalogUnavailable as exc:
        log_event("assistant_tool_failed", trace_id=http_request.state.trace_id,
                  tool="catalog", error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ConversationAccessDenied as exc:
        log_event("assistant_conversation_access_denied", trace_id=http_request.state.trace_id)
        raise HTTPException(status_code=404, detail="Conversation not found.") from exc
    except MemoryStoreUnavailable as exc:
        log_event("assistant_memory_unavailable", trace_id=http_request.state.trace_id,
                  error_type=type(exc).__name__)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    products = result.get("products", [])
    sources = [
        ProductSource(
            product_id=int(product["productId"]),
            name=str(product.get("productName") or ""),
            demo_data=bool(product.get("demoData", False)),
        )
        for product in products
        if product.get("productId") is not None
    ]
    references = [
        KnowledgeReference(
            citation=f"S{index}",
            document_id=str(item["document_id"]),
            title=str(item.get("title") or "Tài liệu"),
            heading=str(item.get("heading") or ""),
            demo_data=bool(item.get("demo_data", False)),
        )
        for index, item in enumerate(result.get("knowledge", []), start=1)
    ]
    return AssistantResponse(
        answer=answer,
        conversation_id=request.conversation_id,
        intent=result.get("intent"),
        tools_used=[
            tool for tool, selected in (
                ("catalog", result.get("needs_catalog")),
                ("knowledge", result.get("needs_knowledge")),
            ) if selected
        ],
        products=products,
        sources=sources,
        references=references,
    )


@app.get("/api/v1/assistant/conversations/{conversation_id}")
async def get_conversation(conversation_id: UUID, request: Request) -> dict:
    try:
        owner_id, username, _identity = await _conversation_owner(request)
        messages = await load_conversation(conversation_id, owner_id, username)
    except ConversationAccessDenied as exc:
        raise HTTPException(status_code=404, detail="Conversation not found.") from exc
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"conversation_id": conversation_id, "messages": messages}


@app.delete("/api/v1/assistant/conversations/{conversation_id}")
async def remove_conversation(conversation_id: UUID, request: Request) -> dict[str, bool]:
    try:
        owner_id, username, _identity = await _conversation_owner(request)
        await delete_conversation(conversation_id, owner_id, username)
    except ConversationAccessDenied as exc:
        raise HTTPException(status_code=404, detail="Conversation not found.") from exc
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"deleted": True}


@app.get("/api/v1/assistant/memory")
async def get_saved_memories(request: Request) -> dict:
    identity = await _resolved_user_identity(request)
    user_id = identity.user_id if identity else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to view saved preferences.")
    try:
        return {"memories": await list_user_memories(user_id, identity.username)}
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.delete("/api/v1/assistant/memory")
async def remove_saved_memories(request: Request) -> dict[str, int]:
    identity = await _resolved_user_identity(request)
    user_id = identity.user_id if identity else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to delete saved preferences.")
    try:
        return {"deleted": await delete_user_memories(user_id, identity.username)}
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.delete("/api/v1/assistant/memory/{memory_id}")
async def remove_saved_memory(memory_id: UUID, request: Request) -> dict[str, bool]:
    identity = await _resolved_user_identity(request)
    user_id = identity.user_id if identity else None
    if user_id is None:
        raise HTTPException(status_code=401, detail="Sign in to delete saved preferences.")
    try:
        deleted = await delete_user_memory(user_id, memory_id, identity.username)
        if not deleted:
            raise HTTPException(status_code=404, detail="Saved preference not found.")
        return {"deleted": True}
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.put("/api/v1/assistant/memory/{memory_id}")
async def update_saved_memory(memory_id: UUID, body: MemoryUpdateRequest, request: Request) -> dict[str, bool]:
    identity = await _resolved_user_identity(request)
    if identity is None:
        raise HTTPException(status_code=401, detail="Sign in to update saved preferences.")
    if contains_sensitive_memory(body.content):
        raise HTTPException(status_code=422, detail="This preference contains sensitive information.")
    try:
        updated = await update_user_memory(
            identity.user_id, memory_id, body.content, identity.username
        )
    except MemoryStoreUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Saved preference not found.")
    return {"updated": True}

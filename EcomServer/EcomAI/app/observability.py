"""Small, dependency-free request/node metrics and structured trace logging."""

import json
import logging
import threading
from collections import defaultdict
from datetime import datetime, timezone

logger = logging.getLogger("app.trace")
_lock = threading.Lock()
_http: dict[tuple[str, str, int], list[float]] = defaultdict(lambda: [0, 0.0])
_nodes: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0, 0.0])
_retrievals: dict[tuple[str, str], int] = defaultdict(int)
_llm_tokens: dict[tuple[str, str], int] = defaultdict(int)


def log_event(event: str, **fields) -> None:
    logger.info(json.dumps({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }, ensure_ascii=False, default=str, separators=(",", ":")))


def record_http(method: str, route: str, status: int, duration_seconds: float) -> None:
    with _lock:
        value = _http[(method, route, status)]
        value[0] += 1
        value[1] += duration_seconds


def record_node(node: str, status: str, duration_seconds: float, trace_id: str | None = None) -> None:
    with _lock:
        value = _nodes[(node, status)]
        value[0] += 1
        value[1] += duration_seconds
    log_event("ai_node_complete", trace_id=trace_id, node=node, status=status,
              duration_ms=round(duration_seconds * 1000, 2))


def record_retrieval(source: str, result_count: int, trace_id: str | None = None) -> None:
    status = "found" if result_count else "empty"
    with _lock:
        _retrievals[(source, status)] += 1
    log_event("ai_retrieval_complete", trace_id=trace_id, source=source,
              status=status, result_count=result_count)


def record_llm_usage(model: str, prompt_tokens: int | None, completion_tokens: int | None,
                     trace_id: str | None = None) -> None:
    with _lock:
        if prompt_tokens is not None:
            _llm_tokens[(model, "prompt")] += max(0, int(prompt_tokens))
        if completion_tokens is not None:
            _llm_tokens[(model, "completion")] += max(0, int(completion_tokens))
    log_event("ai_llm_call_complete", trace_id=trace_id, model=model,
              prompt_tokens=prompt_tokens, completion_tokens=completion_tokens)


def prometheus_metrics() -> str:
    """Render bounded-label process metrics; values reset when the process restarts."""
    lines = [
        "# HELP ecom_ai_http_requests_total Completed HTTP requests.",
        "# TYPE ecom_ai_http_requests_total counter",
        "# HELP ecom_ai_http_request_duration_seconds_sum Total request duration.",
        "# TYPE ecom_ai_http_request_duration_seconds_sum counter",
        "# HELP ecom_ai_node_runs_total Completed LangGraph node runs.",
        "# TYPE ecom_ai_node_runs_total counter",
        "# HELP ecom_ai_node_duration_seconds_sum Total LangGraph node duration.",
        "# TYPE ecom_ai_node_duration_seconds_sum counter",
        "# HELP ecom_ai_retrievals_total Retrieval outcomes by source.",
        "# TYPE ecom_ai_retrievals_total counter",
        "# HELP ecom_ai_llm_tokens_total Token usage reported by the provider.",
        "# TYPE ecom_ai_llm_tokens_total counter",
    ]
    with _lock:
        http = dict(_http)
        nodes = dict(_nodes)
        retrievals = dict(_retrievals)
        tokens = dict(_llm_tokens)

    for (method, route, status), (count, duration) in sorted(http.items()):
        escaped_route = route.replace("\\", "\\\\").replace('"', '\\"')
        labels = f'method="{method}",route="{escaped_route}",status="{status}"'
        lines.append(f"ecom_ai_http_requests_total{{{labels}}} {count}")
        lines.append(f"ecom_ai_http_request_duration_seconds_sum{{{labels}}} {duration:.6f}")
    for (node, status), (count, duration) in sorted(nodes.items()):
        labels = f'node="{node}",status="{status}"'
        lines.append(f"ecom_ai_node_runs_total{{{labels}}} {count}")
        lines.append(f"ecom_ai_node_duration_seconds_sum{{{labels}}} {duration:.6f}")
    for (source, status), count in sorted(retrievals.items()):
        lines.append(f'ecom_ai_retrievals_total{{source="{source}",status="{status}"}} {count}')
    for (model, kind), count in sorted(tokens.items()):
        escaped_model = model.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'ecom_ai_llm_tokens_total{{model="{escaped_model}",kind="{kind}"}} {count}')
    return "\n".join(lines) + "\n"

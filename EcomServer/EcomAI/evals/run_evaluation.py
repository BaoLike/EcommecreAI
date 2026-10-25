"""Run the labeled assistant evaluation cases against a running local service."""

import asyncio
import json
import os
import re
import time
import unicodedata
from pathlib import Path
from uuid import uuid4

import httpx

from app.agent import analyze_intent
from app.catalog import infer_shopping_constraints

ROOT = Path(__file__).resolve().parent
CASES = ROOT / "assistant_cases.jsonl"
API_URL = os.getenv("AI_EVAL_API_URL", "http://localhost:8000").rstrip("/")


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn").replace("đ", "d")


def load_cases() -> list[dict]:
    return [json.loads(line) for line in CASES.read_text(encoding="utf-8").splitlines() if line.strip()]


async def token_snapshot(client: httpx.AsyncClient) -> dict[str, int] | None:
    try:
        response = await client.get("/metrics")
        response.raise_for_status()
    except httpx.HTTPError:
        return None
    totals = {"prompt": 0, "completion": 0}
    for line in response.text.splitlines():
        match = re.match(
            r'ecom_ai_llm_tokens_total\{model=".*",kind="(prompt|completion)"\}\s+([\d.]+)',
            line,
        )
        if match:
            totals[match.group(1)] += int(float(match.group(2)))
    return totals


async def run_case(client: httpx.AsyncClient, case: dict) -> dict:
    conversation_id = str(uuid4())
    guest_session_id = str(uuid4())
    constraints: dict = {}
    short_term: dict = {}
    route_predictions = []
    final_payload: dict = {}
    total_latency = 0.0
    errors = []

    for turn in case["turns"]:
        message = turn["message"]
        constraints.update(infer_shopping_constraints(message))
        route = analyze_intent({
            "message": message,
            "constraints": constraints,
            "conversation_state": short_term,
        })["intent"]
        route_predictions.append(route)

        started = time.perf_counter()
        try:
            response = await client.post("/api/v1/assistant/chat", json={
                "message": message,
                "conversation_id": conversation_id,
            }, headers={"X-Assistant-Session": guest_session_id})
            response.raise_for_status()
            final_payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            errors.append(type(exc).__name__)
            break
        finally:
            total_latency += time.perf_counter() - started

    answer = str(final_payload.get("answer") or "")
    normalized_answer = normalize(answer)
    products = final_payload.get("products") or []
    references = final_payload.get("references") or []
    expected_names = [normalize(value) for value in case.get("expected_product_name_contains", [])]
    returned_names = [normalize(str(item.get("productName") or "")) for item in products]
    name_hits = sum(any(expected in returned for returned in returned_names) for expected in expected_names)
    expected_titles = [normalize(value) for value in case.get("expected_reference_title_contains", [])]
    returned_titles = [normalize(str(item.get("title") or "")) for item in references]
    reference_hits = sum(any(expected in returned for returned in returned_titles) for expected in expected_titles)

    citations = re.findall(r"\[(P|S)(\d+)\]", answer)
    valid_citations = sum(
        1 for kind, number in citations
        if 1 <= int(number) <= (len(products) if kind == "P" else len(references))
    )
    required_terms_ok = all(normalize(term) in normalized_answer for term in case.get("required_answer_terms", []))
    forbidden_terms_ok = all(normalize(term) not in normalized_answer for term in case.get("must_not_include", []))
    final_intent = str(final_payload.get("intent") or (route_predictions[-1] if route_predictions else "none"))
    expected_tools = {
        "catalog": ["catalog"],
        "knowledge": ["knowledge"],
        "mixed": ["catalog", "knowledge"],
        "unsupported_order_lookup": [],
        "general": [],
    }.get(case["expected_intent"], [])
    actual_tools = sorted(final_payload.get("tools_used") or [])
    tool_selection_correct = actual_tools == sorted(expected_tools)
    active_category = constraints.get("category")
    active_max_price = constraints.get("max_price")
    constraints_ok = (
        active_category == case.get("expected_category")
        and active_max_price == case.get("expected_max_price")
    )
    recall = name_hits / len(expected_names) if expected_names else None
    reference_recall = reference_hits / len(expected_titles) if expected_titles else None
    intent_correct = final_intent == case["expected_intent"]
    complete = (
        not errors
        and intent_correct
        and tool_selection_correct
        and constraints_ok
        and required_terms_ok
        and forbidden_terms_ok
        and (recall is None or recall == 1.0)
        and (reference_recall is None or reference_recall == 1.0)
    )

    return {
        "id": case["id"],
        "expected_intent": case["expected_intent"],
        "actual_intent": final_intent,
        "intent_correct": intent_correct,
        "expected_tools": expected_tools,
        "actual_tools": actual_tools,
        "tool_selection_correct": tool_selection_correct,
        "constraints_correct": constraints_ok,
        "product_recall_at_k": recall,
        "reference_recall_at_k": reference_recall,
        "citation_validity": valid_citations / len(citations) if citations else None,
        "groundedness_proxy": valid_citations / len(citations) if citations else None,
        "groundedness_requires_review": bool(products or references),
        "task_complete": complete,
        "latency_ms": round(total_latency * 1000, 2),
        "errors": errors,
        "answer": answer,
    }


async def main() -> None:
    headers = {}
    cookie = os.getenv("AI_EVAL_COOKIE", "").strip()
    if cookie:
        headers["Cookie"] = cookie
    async with httpx.AsyncClient(base_url=API_URL, headers=headers, timeout=40) as client:
        token_before = await token_snapshot(client)
        results = [await run_case(client, case) for case in load_cases()]
        token_after = await token_snapshot(client)

    completed = [row for row in results if not row["errors"]]
    route_hits = sum(row["intent_correct"] for row in results)
    tool_hits = sum(row["tool_selection_correct"] for row in results)
    constraint_count = sum(row["constraints_correct"] for row in results)
    recall_values = [row["product_recall_at_k"] for row in results if row["product_recall_at_k"] is not None]
    citation_values = [row["citation_validity"] for row in results if row["citation_validity"] is not None]
    reference_recall_values = [row["reference_recall_at_k"] for row in results if row["reference_recall_at_k"] is not None]
    token_usage = None
    if token_before is not None and token_after is not None:
        token_usage = {
            key: max(0, token_after[key] - token_before[key])
            for key in ("prompt", "completion")
        }
    summary = {
        "cases": len(results),
        "error_rate": (len(results) - len(completed)) / len(results) if results else 0,
        "intent_accuracy": route_hits / len(results) if results else 0,
        "tool_selection_accuracy": tool_hits / len(results) if results else 0,
        "constraint_accuracy": constraint_count / len(results) if results else 0,
        "mean_product_recall_at_k": sum(recall_values) / len(recall_values) if recall_values else None,
        "mean_reference_recall_at_k": sum(reference_recall_values) / len(reference_recall_values) if reference_recall_values else None,
        "citation_validity_proxy": sum(citation_values) / len(citation_values) if citation_values else None,
        "task_completion_rate": sum(row["task_complete"] for row in results) / len(results) if results else 0,
        "mean_latency_ms": round(sum(row["latency_ms"] for row in results) / len(results), 2) if results else 0,
        "provider_token_usage_delta": token_usage,
        "results": results,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())

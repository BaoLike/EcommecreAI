import re
import asyncio
import unicodedata
from typing import Any

import httpx

from app import settings


class CatalogUnavailable(Exception):
    pass


def _normalize(value: str) -> str:
    value = unicodedata.normalize("NFD", value.lower())
    value = "".join(char for char in value if unicodedata.category(char) != "Mn")
    return value.replace("đ", "d")


def _infer_category(message: str) -> str | None:
    normalized = _normalize(message)
    categories = (
        (("dien thoai", "smartphone", "mobile phone", "iphone"), "Mobile Phones"),
        (("laptop", "notebook", "may tinh xach tay"), "Laptop"),
        (("may tinh bang", "tablet", "ipad"), "Tablet"),
        (("tivi", "television", "smart tv"), "Television"),
        (("may loc", "do gia dung", "home appliance", "gia dung"), "Home Appliances"),
    )
    matches = [
        (normalized.rfind(term), len(term), category)
        for terms, category in categories
        for term in terms
        if term in normalized
    ]
    return max(matches)[2] if matches else None


def _infer_max_price(message: str) -> float | None:
    normalized = _normalize(message)
    cue = r"(?:duoi|toi da|ngan sach|tam gia|khoang|budget|under|below|up to|con)"
    matches = list(re.finditer(
        rf"{cue}[^0-9]{{0,20}}(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|million|vnd|dong|d)?",
        normalized,
    ))
    if not matches:
        return None
    # Contextual queries include earlier turns first, so use the last budget
    # mentioned to support follow-ups such as “thế còn 15 triệu?”.
    match = matches[-1]
    amount = float(match.group(1).replace(",", "."))
    unit = match.group(2)
    if unit in {"trieu", "tr", "m", "million"}:
        amount *= 1_000_000
    elif unit in {"vnd", "dong", "d"}:
        pass
    elif amount < 100_000:
        # Budget phrases without a unit are interpreted as million VND (e.g. "dưới 20").
        amount *= 1_000_000
    return amount


def infer_shopping_constraints(message: str) -> dict[str, Any]:
    """Extract only structured shopping slots that are explicit in this turn."""
    constraints: dict[str, Any] = {}
    category = _infer_category(message)
    max_price = _infer_max_price(message)
    brand = _infer_brand(message)
    if category:
        constraints["category"] = category
    if max_price is not None:
        constraints["max_price"] = max_price
    if brand:
        constraints["brand"] = brand
    return constraints


def _infer_brand(message: str) -> str | None:
    normalized = _normalize(message)
    brands = (
        "Apple", "Asus", "Huawei", "Lenovo", "Dell", "HP", "Acer", "MSI",
        "Samsung", "Xiaomi", "Redmi", "Oppo", "Realme", "Vivo", "Motorola",
    )
    matches = [
        (normalized.rfind(_normalize(brand)), brand)
        for brand in brands
        if _normalize(brand) in normalized
    ]
    return max(matches)[1] if matches else None


def is_product_request(message: str) -> bool:
    """Identify shopping requests so an empty catalog result gets a useful answer."""
    normalized = _normalize(message)
    if _infer_category(message) or _infer_max_price(message) is not None:
        return True
    return any(phrase in normalized for phrase in (
        "mua san pham", "can mua", "muon mua", "goi y san pham", "tu van mua",
        "tim san pham", "recommend a", "looking for a", "want to buy",
    ))


def _is_policy_question(message: str) -> bool:
    normalized = _normalize(message)
    policy_topics = (
        "bao hanh", "doi tra", "chinh sach", "thanh toan", "giao hang", "van chuyen",
        "hoan tien", "don hang", "tiep nhan bao hanh",
    )
    buying_intent = (
        "mua", "goi y san pham", "tu van mua", "chon mua", "so sanh san pham",
        "tim san pham", "tim laptop", "tim dien thoai", "tim may tinh bang",
    )
    return any(topic in normalized for topic in policy_topics) and not any(
        intent in normalized for intent in buying_intent
    )


def _product_text(product: dict[str, Any]) -> str:
    specifications = product.get("specifications") or {}
    return _normalize(" ".join([
        str(product.get("productName") or ""),
        str(product.get("brand") or ""),
        str(product.get("model") or ""),
        str(product.get("description") or ""),
        str(specifications),
    ]))


def _safe_product(product: dict[str, Any]) -> dict[str, Any]:
    return {
        "productId": product.get("productId"),
        "productName": product.get("productName", ""),
        "sku": product.get("sku"),
        "brand": product.get("brand"),
        "model": product.get("model"),
        "warrantyMonths": product.get("warrantyMonths"),
        "specifications": product.get("specifications") or {},
        "description": str(product.get("description") or "")[:500],
        "quantity": product.get("quantity", 0),
        "price": product.get("price", 0),
        "discount": product.get("discount", 0),
        "specialPrice": product.get("specialPrice", product.get("price", 0)),
        "demoData": bool(product.get("demoData", False)),
    }


def _actual_price(product: dict[str, Any]) -> float:
    special_price = product.get("specialPrice")
    return float(special_price if special_price is not None else product.get("price") or 0)


async def _fetch_products(params: dict[str, Any]) -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(timeout=settings.CATALOG_TIMEOUT_SECONDS) as client:
            for page_number in range(settings.MAX_CATALOG_PAGES):
                page_params = {**params, "pageNumber": page_number}
                for attempt in range(2):
                    try:
                        response = await client.get(
                            f"{settings.BUSINESS_API_URL}/public/products",
                            params=page_params,
                        )
                        if attempt == 0 and response.status_code in (429, 500, 502, 503, 504):
                            await asyncio.sleep(0.2)
                            continue
                        response.raise_for_status()
                        break
                    except httpx.TransportError:
                        if attempt == 0:
                            await asyncio.sleep(0.2)
                            continue
                        raise
                payload = response.json()
                catalog.extend(payload.get("content") or [])
                if payload.get("lastPage", True) or not payload.get("content"):
                    break
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        raise CatalogUnavailable("Business product catalog is unavailable") from exc
    return catalog


async def search_catalog(
    message: str,
    constraints: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if _is_policy_question(message):
        return [], []

    category = constraints.get("category")
    max_price = None if constraints.get("clear_max_price") else (
        constraints.get("max_price")
    )
    params: dict[str, Any] = {
        "pageSize": 100,
        "sortBy": "specialPrice",
        "sortOrder": "asc",
        "inStock": "true",
    }
    if category:
        params["category"] = category
    brand_value = str(constraints.get("brand") or "").strip()
    brand = _normalize(brand_value)
    if brand_value:
        params["brand"] = brand_value
    if max_price is not None:
        params["maxPrice"] = max_price

    catalog = await _fetch_products(params)
    query_terms = {
        token for token in re.findall(r"[a-z0-9]+", _normalize(message))
        if len(token) > 1 and token not in {
            "toi", "can", "tim", "mua", "mot", "cho", "voi", "gia", "duoi", "tren",
            "ngan", "sach", "tam", "khoang", "trieu", "tr", "m", "budget", "under",
            "below", "up", "to", "the", "a", "an", "for", "with", "and", "please", "con",
            "hang", "san", "pham", "chinh", "bao", "hanh", "doi", "tra", "ho", "tro",
            "khach", "ve", "la", "co", "khong", "ban", "minh", "hoi", "giup",
        }
    }

    candidates = []
    for product in catalog:
        if int(product.get("quantity") or 0) <= 0:
            continue
        actual_price = _actual_price(product)
        if brand and brand not in _normalize(str(product.get("brand") or "")):
            continue
        searchable = _product_text(product)
        score = sum(1 for token in query_terms if token in searchable)
        # A general policy/support question must not receive arbitrary products
        # merely because the catalog has stock. Explicit filters still allow a
        # filtered product list when the user did not name a model or brand.
        if score == 0 and not (category or max_price is not None or brand):
            continue
        candidate = (score, actual_price, _safe_product(product))
        if max_price is None or actual_price <= float(max_price):
            candidates.append(candidate)

    candidates.sort(key=lambda row: (-row[0], row[1], row[2].get("productId") or 0))
    alternatives: list[dict[str, Any]] = []
    if not candidates and max_price is not None:
        alternative_params = {key: value for key, value in params.items() if key != "maxPrice"}
        alternative_params["minPrice"] = max_price
        alternative_catalog = await _fetch_products(alternative_params)
        alternative_catalog.sort(
            key=lambda product: (
                _actual_price(product),
                int(product.get("productId") or 0),
            )
        )
        alternatives = [
            _safe_product(product)
            for product in alternative_catalog
            if int(product.get("quantity") or 0) > 0
            and _actual_price(product) > float(max_price)
        ][:3]
    return (
        [product for _, _, product in candidates[: settings.MAX_RESULTS]],
        alternatives,
    )

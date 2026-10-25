import os


def _positive_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(name, str(default))))
    except ValueError:
        return default


def _positive_float(name: str, default: float) -> float:
    try:
        return max(0.1, float(os.getenv(name, str(default))))
    except ValueError:
        return default


BUSINESS_API_URL = os.getenv("BUSINESS_API_URL", "http://localhost:8080/api").rstrip("/")
IDENTITY_API_URL = os.getenv("AI_IDENTITY_API_URL", BUSINESS_API_URL).rstrip("/")
IDENTITY_COOKIE_NAME = os.getenv("AI_IDENTITY_COOKIE_NAME", "baolikeEcom").strip()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "AI_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
CATALOG_TIMEOUT_SECONDS = _positive_float("AI_CATALOG_TIMEOUT_SECONDS", 5.0)
LLM_TIMEOUT_SECONDS = _positive_float("LLM_TIMEOUT_SECONDS", 20.0)
LLM_CONNECT_TIMEOUT_SECONDS = _positive_float("LLM_CONNECT_TIMEOUT_SECONDS", 2.0)
LLM_MAX_TOKENS = min(800, _positive_int("LLM_MAX_TOKENS", 400))
MAX_CATALOG_PAGES = _positive_int("AI_MAX_CATALOG_PAGES", 10)
MAX_RESULTS = min(10, _positive_int("AI_MAX_RESULTS", 5))
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").strip().rstrip("/")
LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "").strip()
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "").strip().lower()
AI_RAG_DATABASE_URL = os.getenv("AI_RAG_DATABASE_URL", "").strip()
EMBEDDING_BASE_URL = os.getenv("EMBEDDING_BASE_URL", "").strip().rstrip("/")
EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "").strip()
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "").strip()
EMBEDDING_TIMEOUT_SECONDS = _positive_float("EMBEDDING_TIMEOUT_SECONDS", 300.0)
KNOWLEDGE_DIR = os.getenv("AI_KNOWLEDGE_DIR", "").strip()
RAG_MAX_CHUNKS = min(8, _positive_int("AI_RAG_MAX_CHUNKS", 4))
RAG_TIMEOUT_SECONDS = _positive_float("AI_RAG_TIMEOUT_SECONDS", 5.0)
AI_MEMORY_DATABASE_URL = os.getenv("AI_MEMORY_DATABASE_URL", "").strip()
MEMORY_TIMEOUT_SECONDS = _positive_float("AI_MEMORY_TIMEOUT_SECONDS", 5.0)
IDENTITY_TIMEOUT_SECONDS = _positive_float("AI_IDENTITY_TIMEOUT_SECONDS", 3.0)

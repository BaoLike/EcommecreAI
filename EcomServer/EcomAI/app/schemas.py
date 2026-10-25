from pydantic import BaseModel, Field, field_validator
from uuid import UUID, uuid4


class ShoppingConstraints(BaseModel):
    max_price: float | None = Field(default=None, gt=0, le=1_000_000_000_000)
    category: str | None = Field(default=None, max_length=80)
    brand: str | None = Field(default=None, max_length=100)

    @field_validator("category", "brand")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    constraints: ShoppingConstraints = Field(default_factory=ShoppingConstraints)
    conversation_id: UUID = Field(default_factory=uuid4)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Message must not be blank")
        return cleaned


class MemoryUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=500)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Preference must not be blank")
        return cleaned


class ProductSource(BaseModel):
    type: str = "product"
    product_id: int
    name: str
    demo_data: bool = False


class KnowledgeReference(BaseModel):
    type: str = "document"
    citation: str
    document_id: str
    title: str
    heading: str
    demo_data: bool = False


class AssistantResponse(BaseModel):
    answer: str
    conversation_id: UUID
    intent: str | None = None
    tools_used: list[str] = Field(default_factory=list)
    products: list[dict]
    sources: list[ProductSource]
    references: list[KnowledgeReference] = Field(default_factory=list)

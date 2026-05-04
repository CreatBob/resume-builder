# author: jf
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class ResumeDocumentPayloadDto:
    title: str
    content: dict[str, Any]
    version: int | None = None


@dataclass(slots=True)
class ResumeDocumentDto:
    id: str
    title: str
    content: dict[str, Any] = field(default_factory=dict)
    version: int = 1
    created_at: datetime | None = None
    updated_at: datetime | None = None

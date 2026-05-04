# author: jf
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ResumeDocumentRequest(BaseModel):
    title: str = Field(max_length=120)
    content: dict[str, Any]
    version: int | None = None


class ResumeDocumentResponse(BaseModel):
    id: str
    title: str
    content: dict[str, Any]
    version: int
    createdAt: datetime | None = None
    updatedAt: datetime | None = None

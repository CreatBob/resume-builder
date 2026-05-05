# author: Bob
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
    shareToken: str | None = None
    shareEnabled: bool = False
    sharedAt: datetime | None = None
    createdAt: datetime | None = None
    updatedAt: datetime | None = None


class ResumeShareResponse(BaseModel):
    documentId: str
    shareToken: str
    shareUrl: str
    sharedAt: datetime | None = None


class ResumeSharePublicResponse(BaseModel):
    id: str
    title: str
    content: dict[str, Any]
    version: int
    shareToken: str
    sharedAt: datetime | None = None
    updatedAt: datetime | None = None

# author: Bob
from app.api.schemas.resume_document import (
    ResumeDocumentRequest,
    ResumeDocumentResponse,
    ResumeSharePublicResponse,
    ResumeShareResponse,
)
from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto


def resume_document_request_to_dto(request: ResumeDocumentRequest) -> ResumeDocumentPayloadDto:
    # API 契约使用前端习惯的 camelCase JSON；application 层统一使用 snake_case DTO。
    return ResumeDocumentPayloadDto(
        title=request.title,
        content=request.content,
        version=request.version,
    )


def resume_document_response_from_dto(document: ResumeDocumentDto) -> ResumeDocumentResponse:
    return ResumeDocumentResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        version=document.version,
        shareToken=document.share_token,
        shareEnabled=document.share_enabled,
        sharedAt=document.shared_at,
        createdAt=document.created_at,
        updatedAt=document.updated_at,
    )


def resume_share_response(
    document_id: str,
    share_token: str,
    share_url: str,
    shared_at,
) -> ResumeShareResponse:
    return ResumeShareResponse(
        documentId=document_id,
        shareToken=share_token,
        shareUrl=share_url,
        sharedAt=shared_at,
    )


def resume_share_public_response_from_dto(document: ResumeDocumentDto) -> ResumeSharePublicResponse:
    return ResumeSharePublicResponse(
        id=document.id,
        title=document.title,
        content=document.content,
        version=document.version,
        shareToken=document.share_token or "",
        sharedAt=document.shared_at,
        updatedAt=document.updated_at,
    )

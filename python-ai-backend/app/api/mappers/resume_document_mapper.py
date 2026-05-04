# author: jf
from app.api.schemas.resume_document import ResumeDocumentRequest, ResumeDocumentResponse
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
        createdAt=document.created_at,
        updatedAt=document.updated_at,
    )

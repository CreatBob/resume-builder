# author: Bob
from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto
from app.application.services.resume_document_service import create_resume_document as create_resume_document_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def create_resume_document(workspace_id: str, payload: ResumeDocumentPayloadDto) -> ResumeDocumentDto:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return create_resume_document_service(workspace_id, payload, repository)

# author: Bob
from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto
from app.application.services.resume_document_service import update_resume_document as update_resume_document_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def update_resume_document(workspace_id: str, document_id: str, payload: ResumeDocumentPayloadDto) -> ResumeDocumentDto:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return update_resume_document_service(workspace_id, document_id, payload, repository)

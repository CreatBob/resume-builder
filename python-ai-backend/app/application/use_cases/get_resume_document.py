# author: jf
from app.application.dto.resume_document_dto import ResumeDocumentDto
from app.application.services.resume_document_service import get_resume_document as get_resume_document_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def get_resume_document(document_id: str) -> ResumeDocumentDto:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return get_resume_document_service(document_id, repository)

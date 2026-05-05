# author: Bob
from app.application.dto.resume_document_dto import ResumeDocumentDto
from app.application.services.resume_document_service import get_shared_resume_document as get_shared_resume_document_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def get_shared_resume_document(share_token: str) -> ResumeDocumentDto:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return get_shared_resume_document_service(share_token, repository)

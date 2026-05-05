# author: Bob
from app.application.dto.resume_document_dto import ResumeDocumentDto
from app.application.services.resume_document_service import enable_resume_share as enable_resume_share_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def enable_resume_share(workspace_id: str, document_id: str) -> ResumeDocumentDto:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return enable_resume_share_service(workspace_id, document_id, repository)

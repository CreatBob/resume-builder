# author: Bob
from app.application.dto.resume_document_dto import ResumeDocumentDto
from app.application.services.resume_document_service import list_resume_documents as list_resume_documents_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def list_resume_documents(workspace_id: str) -> list[ResumeDocumentDto]:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    return list_resume_documents_service(workspace_id, repository)

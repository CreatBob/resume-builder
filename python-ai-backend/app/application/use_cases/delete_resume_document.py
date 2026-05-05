# author: Bob
from app.application.services.resume_document_service import delete_resume_document as delete_resume_document_service
from app.bootstrap.container import build_resume_document_repository, resolve_settings


def delete_resume_document(workspace_id: str, document_id: str) -> None:
    settings = resolve_settings()
    repository = build_resume_document_repository(settings)
    delete_resume_document_service(workspace_id, document_id, repository)

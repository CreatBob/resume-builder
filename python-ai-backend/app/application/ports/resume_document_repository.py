# author: Bob
from typing import Protocol

from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto


class ResumeDocumentRepository(Protocol):
    def list_active(self, workspace_id: str) -> list[ResumeDocumentDto]: ...

    def get_active(self, workspace_id: str, document_id: str) -> ResumeDocumentDto | None: ...

    def get_shared_by_token(self, share_token: str) -> ResumeDocumentDto | None: ...

    def create(self, workspace_id: str, payload: ResumeDocumentPayloadDto) -> ResumeDocumentDto: ...

    def update_if_version(
        self,
        workspace_id: str,
        document_id: str,
        payload: ResumeDocumentPayloadDto,
    ) -> ResumeDocumentDto | None: ...

    def enable_share(self, workspace_id: str, document_id: str, share_token: str) -> ResumeDocumentDto | None: ...

    def soft_delete(self, workspace_id: str, document_id: str) -> bool: ...

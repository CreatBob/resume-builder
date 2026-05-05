# author: Bob
from uuid import uuid4

from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto
from app.application.ports.resume_document_repository import ResumeDocumentRepository
from app.domain.exceptions.resume_document_exceptions import (
    ResumeDocumentBadRequestError,
    ResumeDocumentConflictError,
    ResumeDocumentNotFoundError,
)


def list_resume_documents(repository: ResumeDocumentRepository) -> list[ResumeDocumentDto]:
    # 业务含义：多份简历工作区进入 remote 模式时，前端首先需要拿到用户可选的简历集合。
    # application service 只表达“列出未删除简历”这个用例语义，排序和持久化细节由 repository 承接。
    return repository.list_active()


def get_resume_document(document_id: str, repository: ResumeDocumentRepository) -> ResumeDocumentDto:
    safe_id = _normalize_id(document_id)
    document = repository.get_active(safe_id)
    if document is None:
        raise ResumeDocumentNotFoundError("未找到简历")
    return document


def create_resume_document(
    payload: ResumeDocumentPayloadDto,
    repository: ResumeDocumentRepository,
) -> ResumeDocumentDto:
    # 新建流程的关键边界：
    # - API 层负责校验 JSON 形状和字段类型；
    # - application 层负责统一标题兜底，保证前端即使传入空白标题也能得到稳定文档；
    # - infrastructure 层负责生成 ID、写入 MySQL 和返回数据库时间。
    normalized_payload = ResumeDocumentPayloadDto(
        title=_normalize_title(payload.title),
        content=payload.content,
        version=None,
    )
    return repository.create(normalized_payload)


def enable_resume_share(document_id: str, repository: ResumeDocumentRepository) -> ResumeDocumentDto:
    safe_id = _normalize_id(document_id)
    existing = repository.get_active(safe_id)
    if existing is None:
        raise ResumeDocumentNotFoundError("未找到简历")

    if existing.share_enabled and existing.share_token:
        return existing

    share_token = f"share_{uuid4().hex}"
    shared = repository.enable_share(safe_id, share_token)
    if shared is None:
        raise ResumeDocumentNotFoundError("未找到简历")
    return shared


def get_shared_resume_document(share_token: str, repository: ResumeDocumentRepository) -> ResumeDocumentDto:
    safe_token = _normalize_share_token(share_token)
    document = repository.get_shared_by_token(safe_token)
    if document is None:
        raise ResumeDocumentNotFoundError("未找到可分享简历")
    return document


def update_resume_document(
    document_id: str,
    payload: ResumeDocumentPayloadDto,
    repository: ResumeDocumentRepository,
) -> ResumeDocumentDto:
    safe_id = _normalize_id(document_id)
    if payload.version is None:
        raise ResumeDocumentBadRequestError("保存简历时必须携带版本号")

    # 更新流程使用版本号做乐观并发控制：前端多标签页同时编辑时，
    # 只有携带当前版本的请求能成功，旧版本请求返回冲突并提示用户刷新。
    normalized_payload = ResumeDocumentPayloadDto(
        title=_normalize_title(payload.title),
        content=payload.content,
        version=payload.version,
    )
    updated = repository.update_if_version(safe_id, normalized_payload)
    if updated is None:
        existing = repository.get_active(safe_id)
        if existing is None:
            raise ResumeDocumentNotFoundError("未找到简历")
        raise ResumeDocumentConflictError("简历已被其他页面更新，请刷新后再编辑")
    return updated


def delete_resume_document(document_id: str, repository: ResumeDocumentRepository) -> None:
    safe_id = _normalize_id(document_id)
    deleted = repository.soft_delete(safe_id)
    if not deleted:
        raise ResumeDocumentNotFoundError("未找到简历")


def _normalize_id(document_id: str | None) -> str:
    safe_id = str(document_id or "").strip()
    if not safe_id:
        raise ResumeDocumentBadRequestError("简历 ID 不能为空")
    return safe_id


def _normalize_title(title: str | None) -> str:
    value = str(title or "").strip()
    return value or "未命名简历"


def _normalize_share_token(share_token: str | None) -> str:
    value = str(share_token or "").strip()
    if not value:
        raise ResumeDocumentBadRequestError("分享链接无效")
    return value

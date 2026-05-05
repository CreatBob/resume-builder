# author: Bob
from fastapi import APIRouter, Response

from app.api.mappers.resume_document_mapper import (
    resume_document_request_to_dto,
    resume_document_response_from_dto,
    resume_share_public_response_from_dto,
    resume_share_response,
)
from app.api.schemas.resume_document import (
    ResumeDocumentRequest,
    ResumeDocumentResponse,
    ResumeSharePublicResponse,
    ResumeShareResponse,
)
from app.application.use_cases.create_resume_document import (
    create_resume_document as create_resume_document_use_case,
)
from app.application.use_cases.delete_resume_document import (
    delete_resume_document as delete_resume_document_use_case,
)
from app.application.use_cases.enable_resume_share import (
    enable_resume_share as enable_resume_share_use_case,
)
from app.application.use_cases.get_resume_document import (
    get_resume_document as get_resume_document_use_case,
)
from app.application.use_cases.get_shared_resume_document import (
    get_shared_resume_document as get_shared_resume_document_use_case,
)
from app.application.use_cases.list_resume_documents import (
    list_resume_documents as list_resume_documents_use_case,
)
from app.application.use_cases.update_resume_document import (
    update_resume_document as update_resume_document_use_case,
)

router = APIRouter(tags=["resume-documents"])


@router.get("/api/resumes", response_model=list[ResumeDocumentResponse])
def list_resume_documents_route() -> list[ResumeDocumentResponse]:
    # 路由层只负责 HTTP 契约适配：不直接访问 MySQL，也不拼装持久化对象。
    documents = list_resume_documents_use_case()
    return [resume_document_response_from_dto(item) for item in documents]


@router.get("/api/resumes/{document_id}", response_model=ResumeDocumentResponse)
def get_resume_document_route(document_id: str) -> ResumeDocumentResponse:
    return resume_document_response_from_dto(get_resume_document_use_case(document_id))


@router.post("/api/resumes", response_model=ResumeDocumentResponse)
def create_resume_document_route(request: ResumeDocumentRequest) -> ResumeDocumentResponse:
    # 新建链路：API schema 校验 JSON 形状，mapper 转应用 DTO，use case 负责业务编排。
    payload = resume_document_request_to_dto(request)
    return resume_document_response_from_dto(create_resume_document_use_case(payload))


@router.post("/api/resumes/{document_id}/share", response_model=ResumeShareResponse)
def enable_resume_share_route(document_id: str) -> ResumeShareResponse:
    shared = enable_resume_share_use_case(document_id)
    return resume_share_response(
        document_id=shared.id,
        share_token=shared.share_token or "",
        share_url=f"/share/{shared.share_token}",
        shared_at=shared.shared_at,
    )


@router.put("/api/resumes/{document_id}", response_model=ResumeDocumentResponse)
def update_resume_document_route(document_id: str, request: ResumeDocumentRequest) -> ResumeDocumentResponse:
    # 更新链路的版本校验不放在路由层，避免 HTTP 适配代码夹带业务规则。
    payload = resume_document_request_to_dto(request)
    return resume_document_response_from_dto(update_resume_document_use_case(document_id, payload))


@router.delete("/api/resumes/{document_id}", status_code=204)
def delete_resume_document_route(document_id: str) -> Response:
    delete_resume_document_use_case(document_id)
    return Response(status_code=204)


@router.get("/api/resumes/shared/{share_token}", response_model=ResumeSharePublicResponse)
def get_shared_resume_document_route(share_token: str) -> ResumeSharePublicResponse:
    return resume_share_public_response_from_dto(get_shared_resume_document_use_case(share_token))

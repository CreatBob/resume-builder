# author: Bob
import re
from uuid import uuid4

from fastapi import APIRouter, Request, Response

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
WORKSPACE_COOKIE_NAME = "resume_workspace"
WORKSPACE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
WORKSPACE_ID_PATTERN = re.compile(r"^workspace_[0-9a-f]{32}$")


@router.get("/api/resumes", response_model=list[ResumeDocumentResponse])
def list_resume_documents_route(request: Request, response: Response) -> list[ResumeDocumentResponse]:
    # 匿名工作区链路说明：
    # 1) 路由层负责从 cookie 中恢复或创建工作区；
    # 2) use case 只接收纯工作区 ID，不感知 FastAPI request/response；
    # 3) 公开分享页不走这条链路，因此不会误把访客带入主编辑私有空间。
    workspace_id = _resolve_or_create_workspace_id(request, response)
    documents = list_resume_documents_use_case(workspace_id)
    return [resume_document_response_from_dto(item) for item in documents]


@router.get("/api/resumes/{document_id}", response_model=ResumeDocumentResponse)
def get_resume_document_route(document_id: str, request: Request, response: Response) -> ResumeDocumentResponse:
    workspace_id = _resolve_or_create_workspace_id(request, response)
    return resume_document_response_from_dto(get_resume_document_use_case(workspace_id, document_id))


@router.post("/api/resumes", response_model=ResumeDocumentResponse)
def create_resume_document_route(
    request: ResumeDocumentRequest,
    http_request: Request,
    http_response: Response,
) -> ResumeDocumentResponse:
    # 新建链路：API schema 校验 JSON 形状，mapper 转应用 DTO，use case 负责业务编排。
    workspace_id = _resolve_or_create_workspace_id(http_request, http_response)
    payload = resume_document_request_to_dto(request)
    return resume_document_response_from_dto(create_resume_document_use_case(workspace_id, payload))


@router.post("/api/resumes/{document_id}/share", response_model=ResumeShareResponse)
def enable_resume_share_route(document_id: str, request: Request, response: Response) -> ResumeShareResponse:
    workspace_id = _resolve_or_create_workspace_id(request, response)
    shared = enable_resume_share_use_case(workspace_id, document_id)
    return resume_share_response(
        document_id=shared.id,
        share_token=shared.share_token or "",
        share_url=f"/share/{shared.share_token}",
        shared_at=shared.shared_at,
    )


@router.put("/api/resumes/{document_id}", response_model=ResumeDocumentResponse)
def update_resume_document_route(
    document_id: str,
    request: ResumeDocumentRequest,
    http_request: Request,
    http_response: Response,
) -> ResumeDocumentResponse:
    # 更新链路的版本校验不放在路由层，避免 HTTP 适配代码夹带业务规则。
    workspace_id = _resolve_or_create_workspace_id(http_request, http_response)
    payload = resume_document_request_to_dto(request)
    return resume_document_response_from_dto(update_resume_document_use_case(workspace_id, document_id, payload))


@router.delete("/api/resumes/{document_id}", status_code=204)
def delete_resume_document_route(document_id: str, request: Request, response: Response) -> Response:
    workspace_id = _resolve_or_create_workspace_id(request, response)
    delete_resume_document_use_case(workspace_id, document_id)
    response.status_code = 204
    return response


@router.get("/api/resumes/shared/{share_token}", response_model=ResumeSharePublicResponse)
def get_shared_resume_document_route(share_token: str) -> ResumeSharePublicResponse:
    return resume_share_public_response_from_dto(get_shared_resume_document_use_case(share_token))


def _resolve_or_create_workspace_id(request: Request, response: Response) -> str:
    workspace_id = str(request.cookies.get(WORKSPACE_COOKIE_NAME) or "")
    if _is_valid_workspace_id(workspace_id):
        return workspace_id

    # 这里由 API 层创建匿名工作区 cookie，application 及以下层只消费纯字符串工作区 ID。
    # 空 cookie 或坏 cookie 都重新签发，防止异常值继续进入数据库 workspace_id 字段。
    # 这样既保证了 HTTP 边界清晰，也让 Spring / Python 两套后端都能维持一致的免登录隔离语义。
    workspace_id = f"workspace_{uuid4().hex}"
    response.set_cookie(
        key=WORKSPACE_COOKIE_NAME,
        value=workspace_id,
        max_age=WORKSPACE_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=_is_secure_request(request),
        samesite="lax",
        path="/",
    )
    return workspace_id


def _is_valid_workspace_id(workspace_id: str) -> bool:
    return bool(WORKSPACE_ID_PATTERN.fullmatch(workspace_id))


def _is_secure_request(request: Request) -> bool:
    forwarded_proto = str(request.headers.get("x-forwarded-proto") or "").split(",", 1)[0].strip().lower()
    return request.url.scheme == "https" or forwarded_proto == "https"

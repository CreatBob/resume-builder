# author: Bob
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import parse_qs, unquote, urlsplit
from uuid import uuid4

from app.application.dto.resume_document_dto import ResumeDocumentDto, ResumeDocumentPayloadDto
from app.application.ports.resume_document_repository import ResumeDocumentRepository
from app.domain.exceptions.resume_document_exceptions import ResumeDocumentStorageError


@dataclass(frozen=True)
class _ResumeDocumentTableBundle:
    engine: Any
    table: Any


class MySqlResumeDocumentRepository(ResumeDocumentRepository):
    def __init__(self, datasource_url: str, username: str = "", password: str = "") -> None:
        self._bundle = _build_table_bundle(datasource_url, username, password)

    def list_active(self, workspace_id: str) -> list[ResumeDocumentDto]:
        table = self._bundle.table
        statement = (
            table.select()
            .where(table.c.workspace_id == workspace_id)
            .where(table.c.deleted_at.is_(None))
            .order_by(table.c.updated_at.desc(), table.c.id.desc())
        )
        with self._bundle.engine.begin() as connection:
            rows = connection.execute(statement).mappings().all()
        return [_row_to_dto(row) for row in rows]

    def get_active(self, workspace_id: str, document_id: str) -> ResumeDocumentDto | None:
        table = self._bundle.table
        statement = (
            table.select()
            .where(table.c.workspace_id == workspace_id)
            .where(table.c.id == document_id)
            .where(table.c.deleted_at.is_(None))
            .limit(1)
        )
        with self._bundle.engine.begin() as connection:
            row = connection.execute(statement).mappings().first()
        return _row_to_dto(row) if row is not None else None

    def get_shared_by_token(self, share_token: str) -> ResumeDocumentDto | None:
        table = self._bundle.table
        statement = (
            table.select()
            .where(table.c.share_token == share_token)
            .where(table.c.share_enabled.is_(True))
            .where(table.c.deleted_at.is_(None))
            .limit(1)
        )
        with self._bundle.engine.begin() as connection:
            row = connection.execute(statement).mappings().first()
        return _row_to_dto(row) if row is not None else None

    def create(self, workspace_id: str, payload: ResumeDocumentPayloadDto) -> ResumeDocumentDto:
        table = self._bundle.table
        document_id = f"resume_{uuid4().hex}"
        values = {
            "id": document_id,
            "workspace_id": workspace_id,
            "title": payload.title,
            "content_json": payload.content,
            "version": 1,
        }

        # 持久化职责说明：
        # 1) 不在应用启动时建表，表结构由 sql/resume_schema.sql 手工创建；
        # 2) repository 负责按 workspace_id 约束 CRUD，避免匿名工作区再次退回全局共享列表；
        # 3) repository 只通过 SQLAlchemy Core 表达读写意图，不把业务规则上移到 API 层；
        # 4) 创建后重新读取数据库行，确保返回 created_at/updated_at 与 MySQL 实际值一致。
        with self._bundle.engine.begin() as connection:
            connection.execute(table.insert().values(**values))
            row = connection.execute(
                table.select()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.deleted_at.is_(None))
                .limit(1)
            ).mappings().first()

        if row is None:
            raise ResumeDocumentStorageError("简历创建后读取失败")
        return _row_to_dto(row)

    def update_if_version(
        self,
        workspace_id: str,
        document_id: str,
        payload: ResumeDocumentPayloadDto,
    ) -> ResumeDocumentDto | None:
        table = self._bundle.table
        with self._bundle.engine.begin() as connection:
            statement = (
                table.update()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.version == payload.version)
                .where(table.c.deleted_at.is_(None))
                .values(
                    title=payload.title,
                    content_json=payload.content,
                    version=table.c.version + 1,
                    updated_at=_current_database_timestamp(),
                )
            )
            result = connection.execute(statement)
            if result.rowcount == 0:
                return None

            row = connection.execute(
                table.select()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.deleted_at.is_(None))
                .limit(1)
            ).mappings().first()

        if row is None:
            raise ResumeDocumentStorageError("简历更新后读取失败")
        return _row_to_dto(row)

    def enable_share(self, workspace_id: str, document_id: str, share_token: str) -> ResumeDocumentDto | None:
        table = self._bundle.table
        with self._bundle.engine.begin() as connection:
            statement = (
                table.update()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.deleted_at.is_(None))
                .values(
                    share_token=share_token,
                    share_enabled=True,
                    shared_at=_current_database_timestamp(),
                    updated_at=_current_database_timestamp(),
                )
            )
            result = connection.execute(statement)
            if result.rowcount == 0:
                return None

            row = connection.execute(
                table.select()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.deleted_at.is_(None))
                .limit(1)
            ).mappings().first()

        if row is None:
            raise ResumeDocumentStorageError("简历分享状态读取失败")
        return _row_to_dto(row)

    def soft_delete(self, workspace_id: str, document_id: str) -> bool:
        table = self._bundle.table
        with self._bundle.engine.begin() as connection:
            statement = (
                table.update()
                .where(table.c.workspace_id == workspace_id)
                .where(table.c.id == document_id)
                .where(table.c.deleted_at.is_(None))
                .values(
                    deleted_at=_current_database_timestamp(),
                    updated_at=_current_database_timestamp(),
                )
            )
            result = connection.execute(statement)
        return result.rowcount > 0


def _build_table_bundle(datasource_url: str, username: str, password: str) -> _ResumeDocumentTableBundle:
    try:
        from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, MetaData, String, Table, create_engine
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("SQLAlchemy is required for MySQL resume document storage") from exc

    safe_url = _build_sqlalchemy_mysql_url(datasource_url, username, password)
    metadata = MetaData()
    table = Table(
        "resume_documents",
        metadata,
        Column("id", String(64), primary_key=True),
        Column("workspace_id", String(64), nullable=False),
        Column("title", String(120), nullable=False),
        Column("content_json", JSON, nullable=False),
        Column("version", Integer, nullable=False),
        Column("share_token", String(64), nullable=True),
        Column("share_enabled", Boolean, nullable=False),
        Column("shared_at", DateTime, nullable=True),
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime, nullable=False),
        Column("deleted_at", DateTime, nullable=True),
    )

    engine = create_engine(safe_url, pool_pre_ping=True, future=True)
    return _ResumeDocumentTableBundle(engine=engine, table=table)


def _build_sqlalchemy_mysql_url(datasource_url: str, username: str, password: str) -> Any:
    from sqlalchemy.engine import URL, make_url

    safe_url = str(datasource_url or "").strip()
    if not safe_url:
        raise RuntimeError("MYSQL_DATASOURCE_URL is missing")

    if safe_url.startswith("jdbc:mysql://"):
        safe_url = "mysql+pymysql://" + safe_url[len("jdbc:mysql://") :]
    elif safe_url.startswith("mysql://"):
        safe_url = "mysql+pymysql://" + safe_url[len("mysql://") :]

    if not safe_url.startswith("mysql+pymysql://"):
        raise RuntimeError("MYSQL_DATASOURCE_URL must use mysql+pymysql or mysql scheme")

    if "@" in safe_url.split("://", 1)[1].split("/", 1)[0]:
        return make_url(safe_url)

    safe_username = str(username or "").strip()
    safe_password = str(password or "").strip()
    if not safe_username:
        raise RuntimeError("MySQL username is missing")

    parsed = urlsplit(safe_url)
    database = unquote(parsed.path.lstrip("/"))
    if not database:
        raise RuntimeError("MYSQL_DATASOURCE_URL must include database name")

    # SQLAlchemy 官方推荐 URL.create() 承接独立凭据，
    # 这样密码中出现 @、/、: 等字符时无需手工转义，也不会破坏连接 URL。
    query = {key: values[-1] for key, values in parse_qs(parsed.query, keep_blank_values=True).items()}
    return URL.create(
        "mysql+pymysql",
        username=safe_username,
        password=safe_password,
        host=parsed.hostname or "127.0.0.1",
        port=parsed.port or 3306,
        database=database,
        query=query,
    )


def _current_database_timestamp():
    from sqlalchemy import func

    return func.current_timestamp()


def _row_to_dto(row: Any) -> ResumeDocumentDto:
    raw_content = row.get("content_json")
    content = raw_content if isinstance(raw_content, dict) else {}
    return ResumeDocumentDto(
        id=str(row.get("id") or ""),
        title=str(row.get("title") or ""),
        content=content,
        version=int(row.get("version") or 1),
        share_token=str(row.get("share_token") or "") or None,
        share_enabled=bool(row.get("share_enabled") or False),
        shared_at=_as_datetime(row.get("shared_at")),
        created_at=_as_datetime(row.get("created_at")),
        updated_at=_as_datetime(row.get("updated_at")),
    )


def _as_datetime(value: Any) -> datetime | None:
    return value if isinstance(value, datetime) else None

<!-- author: jf -->
# Python 后端多份简历存储对齐

## 1. 背景

Java 后端已经支持多份简历存储，前端在 remote 存储模式下通过 `/api/resumes` 完成简历列表、详情、新建、更新与删除。Python AI Backend 作为同一前端的可选后端，需要同步提供相同能力，确保两套后端在前端契约上保持一致。

## 2. 目标

在 `python-ai-backend/` 中按现有 `api -> application -> domain <- infrastructure` 分层补齐多份简历存储链路，使用 MySQL `resume_documents` 表承接数据，不改变前端调用契约。

## 3. 范围

- 新增 Python 后端 `/api/resumes` CRUD 接口。
- 新增 API schema、mapper、application DTO、use case、repository port、MySQL repository 实现。
- 在依赖容器和 FastAPI 应用中注册该链路。
- 对齐 Java 后端的版本冲突、软删除、时间字段和错误语义。

## 4. 非目标

- 不新增或修改测试代码。
- 不新增数据库建表脚本，继续复用 `sql/resume_schema.sql`。
- 不修改前端 `src/api/resumeApi.ts` 契约。
- 不在应用启动流程中自动建表。

## 5. 细化任务清单

- [已完成] 任务 1：梳理 Java 后端多份简历存储契约和 Python 后端现有分层入口。
- [已完成] 任务 2：新增 Python API schema、application DTO 与 mapper，保持前端字段一致。
- [已完成] 任务 3：新增 repository port、用例层和 MySQL repository，实现列表、详情、新建、更新、软删除。
- [已完成] 任务 4：注册依赖容器和 FastAPI 路由，确保 `/api/resumes` 可达。
- [已完成] 任务 5：执行允许范围内的静态/一次性验证，并逐条更新验收状态。

## 6. 验收细节 list

- [通过] `GET /api/resumes` 返回未删除简历列表，并按 `updatedAt DESC, id DESC` 排序。
- [通过] `GET /api/resumes/{id}` 对空 ID 或不存在 ID 返回明确错误，对存在 ID 返回简历详情。
- [通过] `POST /api/resumes` 可创建 `resume_` 前缀 ID 的简历，标题裁剪并在空标题时回退为 `未命名简历`，版本为 1。
- [通过] `PUT /api/resumes/{id}` 必须携带版本号，版本匹配时更新内容并递增版本，版本不匹配时返回冲突错误。
- [通过] `DELETE /api/resumes/{id}` 执行软删除并返回 204，不物理删除数据。
- [通过] Python 实现不新增测试代码、不写应用启动建表逻辑，并保留 `author: jf` 标识。

## 7. 执行记录

- 2026-05-04：创建需求文档，确认实现范围为同步 Java 后端多份简历存储能力到 Python 后端。
- 2026-05-04：完成 Python API schema、mapper、routes、application DTO、repository port、use cases、application service 与 MySQL repository。
- 2026-05-04：注册 FastAPI 路由、容器构建函数、错误处理器，并将 CORS 方法扩展到 `PUT`、`DELETE`。
- 2026-05-04：执行无落盘 Python 语法编译检查，17 个变更文件通过；默认 Python 缺少 FastAPI，未执行完整应用导入验证。

## 8. 验收结果

- [通过] `GET /api/resumes` 路由已注册，repository 仅查询 `deleted_at IS NULL` 数据，并按 `updated_at desc, id desc` 排序。
- [通过] `GET /api/resumes/{id}` 通过 application service 统一处理空 ID 与不存在 ID，返回 `message` 错误体。
- [通过] `POST /api/resumes` 由 repository 生成 `resume_` 前缀 ID，application service 统一标题裁剪与空标题兜底，版本固定为 1。
- [通过] `PUT /api/resumes/{id}` 在 application service 校验版本号，repository 按 `id + version + deleted_at IS NULL` 更新并递增版本，未更新时区分不存在与版本冲突。
- [通过] `DELETE /api/resumes/{id}` route 返回 204，repository 仅写入 `deleted_at` 做软删除。
- [通过] 未新增测试代码；未新增应用启动建表逻辑；新增/修改 Python 后端文件均使用 `author: jf` 标识，且未发现 `author: ai` 标识。

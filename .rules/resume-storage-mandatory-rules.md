<!-- author: Bob -->
# 多份简历存储强制规则

## 1. 规则定位

本文档用于沉淀当前分支新增的多份简历存储能力，约束前端存储模式、前后端接口契约、数据库归属和联调行为。

凡涉及简历文档列表、新建、切换、重命名、保存、删除、导入导出、远程存储兜底策略的改动，默认都必须遵守本文档。

## 2. 存储模式

前端简历存储模式固定为三种：

- `local`：只使用浏览器本地存储。
- `remote`：只使用后端 `/api/resumes` 接口。
- `auto`：优先探测远程存储；远程不可用时临时回退本地存储。

强制要求：

1. `VITE_RESUME_STORAGE_MODE` 只能取 `local`、`remote`、`auto`。
2. 未配置或配置非法时，默认使用 `auto`，避免纯前端预览场景被后端依赖阻断。
3. `auto` 模式的远程探测失败只允许回退到当前页面会话的本地存储，不得静默把后续请求混写到远程。
4. `remote` 模式失败时必须向用户暴露错误，不得自动吞掉远程保存失败。
5. `remote` 与成功探测远程的 `auto` 模式，主编辑工作区必须按匿名工作区隔离；不得再暴露全局共享简历列表。
6. 匿名工作区应由后端在首次请求时签发稳定标识，优先通过 `HttpOnly` cookie 持久化；前端不应显式传递 `workspace_id` 查询参数。
7. 匿名工作区 cookie 名称固定为 `resume_workspace`，值格式固定为 `workspace_` + 32 位小写十六进制字符；后端收到缺失或格式非法的 cookie 时必须重新签发，禁止把异常值写入 `workspace_id` 字段。

## 3. 前端职责边界

1. `src/api/resumeApi.ts` 只定义 `/api/resumes` 请求，不承载业务状态编排。
2. 简历文档列表、当前文档 ID、本地迁移、自动保存、远程兜底等流程必须放在 `src/services/` 或 `src/stores/` 对应职责中。
3. 旧版 `resume-builder-data` 本地数据迁移只能由本地存储 driver 承接，不得散落在页面组件中。
4. 保存远程简历时必须携带 `version`，并把 `409` 冲突转换成用户可理解的并发编辑提示。

## 4. 后端契约

Spring AI 后端与 Python AI Backend 必须保持同一组接口：

- `GET /api/resumes`
- `GET /api/resumes/{id}`
- `POST /api/resumes`
- `PUT /api/resumes/{id}`
- `DELETE /api/resumes/{id}`

响应字段必须保持一致：

- `id`
- `title`
- `content`
- `version`
- `createdAt`
- `updatedAt`

错误响应中必须包含前端可读取的 `message` 字段，尤其是版本冲突、未找到简历、参数不合法等场景。

补充约束：

1. `GET /api/resumes`、`GET /api/resumes/{id}`、`POST /api/resumes`、`PUT /api/resumes/{id}`、`DELETE /api/resumes/{id}`、`POST /api/resumes/{id}/share` 都必须限定在当前匿名工作区内。
2. `GET /api/resumes/shared/{shareToken}` 继续作为公开分享读取接口，不依赖匿名工作区 cookie。

## 5. 数据库归属

1. 多份简历文档属于结构化业务数据，固定使用 MySQL。
2. PostgreSQL + pgvector 只用于 RAG 向量存储，不得用于简历文档表。
3. 简历文档表结构固定落在 `sql/resume_schema.sql`。
4. 应用启动流程不得自动建表；Docker 启动脚本如执行 SQL，必须是显式脚本流程，不属于后端应用启动建表。
5. Spring AI 后端业务 SQL 必须写在 `spring-ai-backend/src/main/resources/mapper/*.xml`。
6. `resume_documents` 必须包含匿名工作区归属字段，例如 `workspace_id`；主编辑态查询不得命中空工作区或其他工作区数据。

## 6. 跨后端一致性

1. Java 与 Python 两套后端的简历文档行为必须保持一致：标题兜底、软删除、更新时间、版本冲突、错误文案都不能分叉。
2. CORS 必须允许前端 remote 模式需要的 `GET`、`POST`、`PUT`、`DELETE`、`OPTIONS` 方法。
3. 新增或调整简历存储接口时，必须同步检查 README、Docker 启动脚本、`.env.docker.example` 与 `env.d.ts`。
4. Java 与 Python 两套后端的匿名工作区 cookie 名称、生成策略和“分享接口不依赖工作区”的行为必须保持一致。

## 7. 审查口径

审查多份简历存储相关改动时，至少检查：

1. 是否破坏 `src/api` 与 `src/services` 的职责边界。
2`auto` 模式是否仍能支持纯前端模板预览和本地编辑。
3`remote` 模式是否能正确暴露后端不可用、版本冲突和参数错误。

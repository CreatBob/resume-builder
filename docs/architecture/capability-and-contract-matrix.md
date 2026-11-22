<!-- author: Bob -->
# Resume Builder 多端能力矩阵与接口契约基线

## 1. 部署形态与前端能力矩阵

严格遵循 [theme-tokens.md](../design-system/theme-tokens.md) 的能力显示原则：前端工作台主界面聚焦于简历编辑、A4 实时预览、简历分享与 AI 简历优化建议；AI 面试与知识库模块代码与双后端接口完整保留在仓库中供后端线演进，不在主界面提供一级导航切换。

| 能力项 | 纯静态前端（默认 / GitHub Pages） | Cloudflare Pages（含 KV & 边缘代理） | Spring AI 全栈（Docker / 本地） | Python AI 全栈（Docker / 本地） |
| :--- | :--- | :--- | :--- | :--- |
| 推荐 `VITE_APP_FEATURE_MODE` | `resume-only` | `resume-only` | `resume-only` | `resume-only` |
| 推荐 `VITE_RESUME_STORAGE_MODE` | `local`（或 `auto`） | `local` | `remote` / `auto` | `remote` / `auto` |
| 推荐 `VITE_AI_PROVIDER_MODE` | `byok` | `byok` | `byok` / `backend` | `byok` / `backend` |
| 模块化编辑 / 9 套 A4 模板 / 导出 PDF·MD·JSON | 支持 | 支持 | 支持 | 支持 |
| 移动端「编辑 / 预览」切换与 A4 等比缩放 | 支持 | 支持 | 支持 | 支持 |
| 多简历管理 | 浏览器 `localStorage` | 浏览器 `localStorage` | MySQL 匿名工作区隔离 | MySQL 匿名工作区隔离 |
| AI 简历优化（JD / 场景 / Diff / 缺口追问） | 浏览器直连 BYOK | 浏览器直连 + 可选 `/api/ai-proxy` 解决 CORS | 默认 BYOK（或设 `backend` 走 `/api/ai/chat/stream`） | 默认 BYOK（或设 `backend` 走 `/api/ai/chat/stream`） |
| 简历在线分享 | URL Hash 离线压缩链接 | Cloudflare KV 短链（`cf_*`）+ 离线链接兜底 | MySQL 公开短链（`/share/{token}`） | MySQL 公开短链（`/share/{token}`） |
| 后端 AI 面试 / 知识库 RAG 接口 | 前端主界面不展示切换入口 | 前端主界面不展示切换入口 | 后端接口与源码完整保留（MySQL + pgvector） | 后端接口与源码完整保留（MySQL + pgvector） |

---

## 2. 前端环境变量清单

| 变量名 | 可选值 | 默认值 | 用途说明 |
| :--- | :--- | :--- | :--- |
| `VITE_APP_FEATURE_MODE` | `resume-only` \| `full` | `resume-only` | 前端主界面统一聚焦简历工作台与简历 AI 优化 |
| `VITE_RESUME_STORAGE_MODE` | `local` \| `remote` \| `auto` | `auto` | 控制简历存储走浏览器本地、后端远程或探测自动回退 |
| `VITE_AI_PROVIDER_MODE` | `byok` \| `auto` \| `backend` | `byok` | `byok` / `auto` 使用前端自带 API Key；`backend` 强制走后端 `/api/ai/chat/stream` |
| `VITE_AI_PROXY_PATH` | URL 路径 | `/api/ai-proxy/chat/completions` | BYOK 开启“通过边缘代理解决跨域”时的同源转发端点 |
| `VITE_CLOUDFLARE_SHARE_API` | URL 路径 | `/api/shares` | 纯前端 `local` 模式下 Cloudflare KV 短链读写删改接口前缀 |

---

## 3. 核心接口契约基线

### 3.1 后端全栈 AI 与简历契约（Java 与 Python 必须完全一致）

- **AI 能力（`/api/ai/*`）**：
  - `POST /api/ai/chat`：普通问答
  - `POST /api/ai/chat/stream`：SSE 流式输出（`event: chunk` / `event: error`）
  - `POST /api/ai/interview/turn/stream`：NDJSON 面试流式回合
  - `GET /api/ai/interview/sessions` & `GET /api/ai/interview/sessions/{sessionId}`
  - `POST /api/ai/rag/query`、`POST /api/ai/rag/documents`、`POST /api/ai/rag/upload`
  - `POST /api/ai/realtime/client-secret`、`WS /ws/ai/realtime-asr`
- **多简历与分享（`/api/resumes/*`，遵循 `.rules/resume-storage-mandatory-rules.md`）**：
  - `GET /api/resumes`、`GET /api/resumes/{id}`、`POST /api/resumes`、`PUT /api/resumes/{id}`、`DELETE /api/resumes/{id}`（受 `resume_workspace` HttpOnly Cookie 隔离，更新携带 `version`，冲突返回 `409` 及 `{ message }`）
  - `POST /api/resumes/{id}/share`：创建或获取当前工作区简历的分享令牌
  - `GET /api/resumes/shared/{shareToken}`：公开只读接口，不依赖工作区 Cookie

### 3.2 Cloudflare Pages Functions 轻量契约（纯前端线）

- **Cloudflare KV 短链分享（`/api/shares`）**：
  - `POST /api/shares`：接收 `{ title, content, version, ttlDays }`（限制 JSON `<= 200KB`），返回 `201 { shareToken, shareUrl, manageToken, expiresAt, sharedAt, updatedAt }`（`shareToken` 固定以 `cf_` 开头）。
  - `GET /api/shares/{shareToken}`：公开只读接口，返回与 `SharedResumeDocument` 对齐的字段（`id, title, content, version, shareToken, sharedAt, updatedAt`），绝不泄露 `manageTokenHash`。
  - `PUT /api/shares/{shareToken}`：校验请求头 `X-Share-Manage-Token` 哈希匹配后覆盖更新快照与 TTL。
  - `DELETE /api/shares/{shareToken}`：校验 `X-Share-Manage-Token` 哈希匹配后从 KV 删除，实现立即撤回。
  - 若站点未绑定 KV（`RESUME_SHARES`），返回 `503 { message }`，前端自动引导切换至离线压缩链接。
- **BYOK 无状态边缘 CORS 代理（`/api/ai-proxy/chat/completions`）**：
  - 仅接受 `POST` / `OPTIONS`，请求体限制 `<= 256KB`；
  - 从请求头 `X-Target-Base-Url` 读取上游接口地址，强制要求 `https://` 且拦截内网/环回地址防 SSRF；
  - 透传 `Authorization` 与流式响应体，不写存储、不记录密钥日志。

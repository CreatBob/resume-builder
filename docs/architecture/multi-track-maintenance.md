<!-- author: Bob -->
# Resume Builder 三线并行维护与分支架构规范

## 1. 为什么不采用“三条长期并行研发分支”

当前仓库同时承担三条技术产品线：

1. **纯前端线**：`src/` + `functions/` + `package.json`（可部署到 Cloudflare Pages / 静态 Nginx）。
2. **Java 后端线**：`spring-ai-backend/`（Java 21 + Spring Boot 3 + Spring AI + MyBatis-Plus）。
3. **Python 后端线**：`python-ai-backend/`（Python 3.11+ + FastAPI）。

如果长期把这三条线拆成三个互相隔离的长期开发分支（例如常驻 `frontend` / `java` / `python` 分支各自写代码并频繁 cherry-pick）：

- **前端模板、移动端布局、表单字段修改**需要跨 3 个分支反复合并，极易漏同步；
- **SQL 表结构（`sql/`）与接口契约（`/api/ai/*`、`/api/resumes/*`）** 很容易在一个分支先改而另外两个分支漂移；
- **AI 协作规则（`.rules/`）与设计规范（`docs/design-system/`）** 也会出现版本分裂。

因此本仓库正式确立：**单主干 `main` Monorepo + 目录边界解耦 + 部署 Profile 隔离 + 按路径触发独立 CI**。

---

## 2. 目录所有权与三条交付线边界

| 交付线 | 核心目录 | 部署构建入口 | 环境变量与配置源 | 独占能力 |
| :--- | :--- | :--- | :--- | :--- |
| **纯前端线（Cloudflare / 静态）** | `src/`、`functions/`、`public/`、`wrangler.toml` | `npm run build-only` -> `dist/` | `VITE_APP_FEATURE_MODE=resume-only`<br>`VITE_RESUME_STORAGE_MODE=local`<br>`VITE_AI_PROVIDER_MODE=byok` | 浏览器本地多简历、自带 Key (BYOK) 简历优化、KV 短链与离线压缩分享 |
| **Java 后端线（Spring AI）** | `spring-ai-backend/`、`sql/` | `docker compose --profile spring-ai` | `spring-ai-backend/.env` / `.env` | Spring AI 面试、MySQL 会话/简历存储、pgvector RAG、DashScope 实时语音 |
| **Python 后端线（FastAPI）** | `python-ai-backend/`、`sql/` | `docker compose --profile python-ai` | `python-ai-backend/.env` / `.env` | FastAPI AI 面试、MySQL 会话/简历存储、pgvector RAG、AutoGen 多智能体扩展 |
| **共享底座** | `src/`、`sql/`、`.rules/`、`docs/` | 各线共用 | 仓库根目录 | 前端工作台、9 套 A4 模板、SQL Schema 与接口契约文档 |

---

## 3. Git 分支与并行协作流程

严格遵守 [global-rules.md](../../.rules/global-rules.md)，**禁止直接在 `main` 提交**。三条线开发者或 AI 协作按以下分支前缀并行开发短期特性分支，验收后合并回 `main`：

| 分支前缀 | 适用车道 | 允许改动主目录 | 关联强制规则 |
| :--- | :--- | :--- | :--- |
| `feature/fe-*` | 纯前端 / 移动端 / 模板 / Cloudflare Functions | `src/`、`functions/`、`wrangler.toml` | `.rules/frontend-mandatory-rules.md` |
| `feature/java-*` | Spring AI Java 后端 | `spring-ai-backend/`、`sql/` | `.rules/backend-mandatory-rules.md` + `.rules/spring-ai-backend-mandatory-rules.md` |
| `feature/py-*` | Python AI FastAPI 后端 | `python-ai-backend/`、`sql/` | `.rules/backend-mandatory-rules.md` + `.rules/python-ai-backend-mandatory-rules.md` |
| `feature/contract-*` | 跨栈接口契约 / 能力矩阵 / 规则变更 | `docs/architecture/`、`sql/`、三端适配 | 契约先落文档，再同步双后端与前端 |
| `fix/*` / `hotfix/*` | 缺陷与紧急修复 | 按最小影响面限制 | `.rules/code-review-rules.md` |

### 跨栈变更黄金顺序（Contract-First）

1. 在 `feature/contract-*` 分支先更新 [capability-and-contract-matrix.md](./capability-and-contract-matrix.md) 与对应 `sql/`；
2. 分别同步 `spring-ai-backend/` 与 `python-ai-backend/` 实现，确保错误字段 `message`、响应字段与 HTTP 状态码完全对齐；
3. 更新 `src/api/`（仅请求定义）与 `src/services/`（业务编排），保证三种存储与 AI 模式（`byok` / `auto` / `backend`）正常降级；
4. 通过 `.github/workflows/ci-multi-track.yml` 按路径分别校验三端后再合入 `main`。

---

## 4. CI 路径解耦与互不阻塞机制

仓库使用 `.github/workflows/ci-multi-track.yml` 实现“改动哪条线只校验哪条线”：

- **前端与边缘函数线（`frontend-check`）**：当 `src/**`、`functions/**`、`index.html`、`package*.json`、`vite.config.ts` 变更时触发，执行 `npm ci` -> `npm run lint:check` -> `npm run type-check` -> `npm run build` 及纯前端模式构建检查。
- **Java 后端线（`spring-ai-check`）**：当 `spring-ai-backend/**` 或 `sql/**` 变更时触发，执行 `mvn -B -q -DskipTests compile`。
- **Python 后端线（`python-ai-check`）**：当 `python-ai-backend/**` 或 `sql/**` 变更时触发，执行 `python -m compileall app`。

由此实现：纯前端样式与 Cloudflare 优化不会因为 Java/Python 环境依赖而失败阻塞；Java 与 Python 后端各自演进也互不干扰。

---

## 5. 可选：对外分发“单线只读分支”（`dist/*`）

如果某些团队成员或第三方托管平台只需要拉取“纯净单技术栈目录”而非完整 Monorepo，**不要手工在单独分支研发**，而是在 GitHub Actions 中在 `main` 合入后单向生成**只读发行分支**（`dist/frontend-only`、`dist/spring-ai`、`dist/python-ai`）：

```yaml
# 可选单向发行作业参考片段（仅在需要对外提供单线只读分支时启用）
# - dist/frontend-only: 仅保留 src/, functions/, public/, package*, vite.config.ts, wrangler.toml, index.html
# - dist/spring-ai:     保留前端 + spring-ai-backend/ + sql/ + docker-compose.yml
# - dist/python-ai:     保留前端 + python-ai-backend/ + sql/ + docker-compose.yml
```

> 关键约束：`dist/*` 分支永远只由 CI 从 `main` 单向覆盖生成，严禁任何人在 `dist/*` 上直接提交代码。

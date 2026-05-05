<!-- author: Bob -->
# AI 执行规范
## 仓库规则文档编码与读取要求（强制）
1. 读取 `AGENTS.md`、`.rules/*.md`、`README.md` 与相关协作文档时，必须显式按 `UTF-8` 读取；

## 仓库规则渐进式加载要求（强制）

1. 每次会话或任务开始时，遵守以下启动必读核心入口：
   - `AGENTS.md`
   - `.rules/global-rules.md`
   - `.rules/harness-mcp-workflow-rules.md`
2. `AGENTS.md` 负责安全底线与规则索引；`.rules/global-rules.md` 负责基础交互、命令、Git 与通用协作约束；`.rules/harness-mcp-workflow-rules.md` 负责贯穿每次协作的 Harness 工作流、任务拆分、验收闭环与 MCP 使用顺序。
3. 禁止在任务范围尚未判定前无差别读取 `.rules/` 下全部规则文档。AI 必须先基于用户需求、影响目录、涉及技术栈与协作阶段判断任务车道，再按下方索引补读相关专项规则。
4. 若执行过程中任务范围扩大或触发新的车道，必须立即按 UTF-8 补读对应专项规则，再继续实现或答复。
5. 后续 `.rules/` 目录新增规则文档时，默认纳入“按需加载”规则索引；只有确认为所有任务都必须遵守的跨域流程或安全底线，才允许升级为启动必读核心入口。

## `.rules` 专项规则按需加载索引（强制）

| 规则文档 | 触发条件 |
| --- | --- |
| `.rules/code-conventions.md` | 修改或生成任何代码、注释、日志、命名、本地化文案、翻译文本、提交信息时读取。 |
| `.rules/frontend-mandatory-rules.md` | 涉及 `src/` 前端页面、组件、模板、样式、状态、接口定义、服务编排、前端验证时读取。 |
| `.rules/backend-mandatory-rules.md` | 涉及 `python-ai-backend/`、`spring-ai-backend/`、后端接口、业务编排、数据库、RAG、语音、Realtime 或后端验证时读取。 |
| `.rules/spring-ai-backend-mandatory-rules.md` | 涉及 `spring-ai-backend/`、Java/Spring AI、MyBatis、Mapper XML、Spring 后端 OpenAI 接入或 pgvector 适配时读取。 |
| `.rules/python-ai-backend-mandatory-rules.md` | 涉及 `python-ai-backend/`、FastAPI、Python AI 编排、Python OpenAI 接入、Python RAG/Realtime/Agent 能力时读取。 |
| `.rules/resume-storage-mandatory-rules.md` | 涉及多份简历、`VITE_RESUME_STORAGE_MODE`、`/api/resumes`、本地/远程/auto 存储、简历列表、新建、切换、保存、删除、版本冲突时读取。 |
| `.rules/code-review-rules.md` | 涉及提交前流程、代码审查、PR/MR review、review 修复、`code-review` 或 `code-review-fix` skill 时读取。 |

相关协作文档也必须按需加载：
- 涉及项目总览、启动、部署、环境变量、目录结构或接口摘要时，  读取`README.md` 的相关章节，而不是默认全文塞入上下文。
- 涉及 Harness Engineering 背景、任务路由、知识回写或熵治理细节时，  读取`docs/harness-engineering-workflow.md` 的相关章节。
- 涉及前端视觉、样式、主题、布局、部署模式能力显示或页面信息架构时，  读取`.rules/frontend-mandatory-rules.md` 与 `docs/design-system/theme-tokens.md` 的相关章节。

本规范适用于本仓库内所有 AI 协作与自动化改动。

## 测试代码约束（强制）

1. 禁止在项目中新增任何测试代码。
2. 禁止修改现有测试代码。
3. 禁止为测试目的新增以下内容：
   - `src/test`、`__tests__`、`tests` 目录下任何文件
   - `*.test.*`、`*.spec.*` 文件
   - 测试专用脚本、测试夹具（fixture）、测试桩（mock）文件
4. 禁止为了验证问题而提交“临时测试代码”。

## 数据库与 Mapper SQL 约束（强制）

1. 后端运行代码中禁止写死 PostgreSQL、MySQL 或其他数据库 SQL 字符串，包括 `SELECT`、`INSERT`、`UPDATE`、`DELETE`、`CREATE`、`ALTER`、`DROP`、索引初始化等语句。
2. MySQL 如确需自定义业务 SQL，必须写在 `mapper.xml` 文件中，不允许直接写在 Mapper 接口注解里（如 `@Select`、`@Update`、`@Insert`、`@Delete`），也不允许写在 Controller、Service、Config 或其他 Java 代码中。
3. Spring AI 后端 Java `mapper/` 目录只允许存放带 `@Mapper` 的 Mapper 接口；MyBatis 查询投影、结果行对象、Row/Projection 类必须放入 `entity/`，对外 API 模型才放入 `dto/`。
4. PostgreSQL + pgvector 向量库存储与相似度检索必须优先使用 Spring AI `VectorStore` / `PgVectorStore` 提供的 `add`、`similaritySearch` 等能力，禁止在后端代码中手写 pgvector 插入、检索或建表 SQL。
5. 建表、索引、初始化等一次性 SQL（非项目运行期业务逻辑）必须写入固定 SQL 目录下的独立 `.sql` 文件，固定 SQL 目录为：`sql/`。
6. 禁止在应用启动流程中执行项目自写的一次性 SQL，也禁止 Spring AI `PgVectorStore` 自动建表；pgvector 表必须由开发者手工执行 `sql/pgvector_rag_schema.sql` 创建，Spring AI 后端必须保持 `initializeSchema(false)`。

## 会话存储数据库约束（强制）

1. AI 面试会话存储数据库固定为 MySQL。
2. PostgreSQL 仅用于向量存储（pgvector）相关能力，不用于会话表存储。
3. 会话建表脚本仅保留一份：`sql/interview_schema.sql`。
4. MySQL 面试会话表和 pgvector RAG 向量表都禁止应用启动自动建表，仍由开发者手工执行 `sql/interview_schema.sql` 与 `sql/pgvector_rag_schema.sql`。

## 文件作者标识约束（强制）

1. 除 `mapper.xml` 外，新增或修改的文件必须标记作者信息（如注释头、元数据）。
2. 作者必须为 `Bob`。
3. 禁止出现作者为 `ai` 的标识（包括 `author: ai`、`作者：ai`、`created by ai` 等）。

## 允许的验证方式（不改项目代码）

1. 运行现有命令进行验证（不新增文件、不改源码）：
   - `npm run type-check`
   - `npm run lint`
   - `npm run build` 或 `npm run build-only`
2. 本地手工验证（UI 操作、接口调用、日志观察）。
3. 一次性命令行验证（不落盘到项目文件，不生成新代码文件）。

## 提交流程要求

1. 所有功能修复与优化，不得以“补测试代码”作为交付前置条件。
2. 变更说明中必须记录验证方式与验证结果。
3. 评审发现测试代码变更时，必须先移除再继续评审。

## 协作参考文档

1. `docs/harness-engineering-workflow.md`
   - 仓库级 Harness Engineering 工作流，适用于任务路由、知识回写、熵治理与跨前后端协作时参考。
2. `docs/design-system/theme-tokens.md`
   - 前端主题 Token 与视觉规范，适用于页面重设计、组件样式、模板选择界面、AI 面板、AI 面试页、知识库页和部署模式能力显示规则。
   - 凡涉及前端视觉、样式、主题或交互层级调整时，必须先阅读 `.rules/frontend-mandatory-rules.md` 和本文档。

## MCP 使用要求

1. 涉及 OpenAI 能力、官方文档、模型选择、API 迁移与 SDK 接入时，必须优先按 `.rules/harness-mcp-workflow-rules.md` 使用 `openaiDeveloperDocs`。
2. 涉及前端页面、交互、模板、流式渲染与视觉验证时，必须优先按 `.rules/harness-mcp-workflow-rules.md` 使用 `playwright`。
3. 涉及 PR、Issue、Review、Checks 与远程协作上下文时，必须优先按 `.rules/harness-mcp-workflow-rules.md` 使用 `github`。
4. `memory` 只能用于长期个人偏好，不得替代仓库规则、接口契约与项目事实。

## 新功能开发要求

1. 新功能、行为变更或多步骤优化任务，必须先按 `.rules/harness-mcp-workflow-rules.md` 输出细化任务清单，不得直接跳过拆分进入实现。
2. 用户需求不清晰时，必须先提供一版初步任务 todo list 让用户澄清或确认。
3. 在用户确认细化任务后，必须先生成验收细节 list 与需求文档 `.md`，再开始顺序执行。
4. 执行时必须按细化任务顺序逐条完成，并在需求文档中同步标记状态。
5. 全部细化任务完成后，必须按验收细节 list 对每一项给出 `通过` 或 `不通过` 结论；存在 `不通过` 时不得声称完成，必须修正并重新进行全量验收。

<!-- author: jf -->
# 代码审查与多份简历存储规则沉淀

## 1. 背景

当前分支新增了多份简历存储、前端 remote/local 存储切换、Spring AI 与 Python AI Backend 简历文档接口对齐，以及 Docker / SQL / README 相关联调说明。用户要求对最近新增功能做代码审查，审查完成后提交，并判断是否有规则和规范需要沉淀。

## 2. 目标

- 按仓库 `code-review` 规范完成当前分支审查并更新中文审查报告。
- 对照仓库强制规则检查未提交改动和最近三个提交的增量。
- 将多份简历存储形成的稳定约束沉淀为仓库规则文档。
- 执行允许范围内的验证命令并记录结果。
- 完成一次符合仓库提交规范的中文 Conventional Commit。

## 3. 范围

- 当前分支 `feature/resume-layout-settings` 相对远端的新增提交。
- 当前工作区未提交改动。
- `src/` 前端简历存储链路。
- `spring-ai-backend/` 与 `python-ai-backend/` 简历文档接口链路。
- `.rules/`、`AGENTS.md`、`code-review/`、`docs/requirements/` 文档与规则。

## 4. 非目标

- 不新增或修改任何测试代码。
- 不重构本轮审查范围外的页面、模板和后端能力。
- 不启动真实数据库或写入业务数据。
- 不创建新的后端接口能力。

## 5. 细化任务清单

- [已完成] 读取 AGENTS、`.rules/`、README 与 `code-review` 技能审查标准。
- [已完成] 梳理当前分支最近新增功能和未提交改动。
- [已完成] 执行代码审查并更新 `code-review/feature-resume-layout-settings.md`。
- [已完成] 沉淀多份简历存储专项规则到 `.rules/resume-storage-mandatory-rules.md`。
- [已完成] 执行允许范围内的验证命令。
- [已完成] 按验收细节逐条更新结果并提交。

## 6. 验收细节 list

- [通过] 审查报告存在且使用中文输出 P0/P1/P2、评分、星级、结论、验证结果。
- [通过] `.rules/resume-storage-mandatory-rules.md` 存在，包含作者 `jf`，并覆盖存储模式、接口契约、数据库归属和审查口径。
- [通过] 未新增或修改测试代码。
- [通过] 作者标识规则保持 `jf`，不存在 `author: ai`、`作者：ai`、`created by ai`。
- [通过] 已运行允许的验证命令，或明确记录未运行原因。
- [通过] 工作区变更已按中文 Conventional Commit 提交。

## 7. 执行记录

- 2026-05-04：完成仓库规则、README 和审查标准读取。
- 2026-05-04：确认新增功能集中在多份简历存储、remote/local/auto 存储模式、双后端接口对齐与 Docker/SQL 联调说明。
- 2026-05-04：修正 `AGENTS.md` 作者规则冲突，恢复为 `jf`。
- 2026-05-04：恢复 `.rules/global-rules.md` 中验证命令例外的明确范围，避免规则被放宽。
- 2026-05-04：新增 `.rules/resume-storage-mandatory-rules.md`，沉淀多份简历存储专项规则。
- 2026-05-04：完成 `npm run type-check`、`npm run lint`、`git diff --check`、Python 变更文件内存编译、Mapper SQL 注解检索、作者标识检索和测试代码检索。
- 2026-05-04：更新 `code-review/feature-resume-layout-settings.md`，记录开放问题为 0、评分 96/100、建议合并。
- 2026-05-04：本需求文档、审查报告、专项规则与存储模式修补将一起纳入本次中文 Conventional Commit。

## 8. 验收结果

- [通过] 审查报告存在且使用中文输出 P0/P1/P2、评分、星级、结论、验证结果。
- [通过] `.rules/resume-storage-mandatory-rules.md` 存在，包含作者 `jf`，并覆盖存储模式、接口契约、数据库归属和审查口径。
- [通过] 未新增或修改测试代码。
- [通过] 作者标识规则保持 `jf`，不存在 `author: ai`、`作者：ai`、`created by ai`。
- [通过] 已运行允许的验证命令，或明确记录未运行原因。
- [通过] 工作区变更已按中文 Conventional Commit 提交。

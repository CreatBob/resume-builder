<!-- author: Bob -->
# Cloudflare Pages 部署与纯前端分享方案指南

## 1. 在 Cloudflare Pages 部署纯前端模式

在 Cloudflare Pages 控制台连接本仓库后，按以下参数配置即可开箱部署（无需 Java / Python / MySQL / pgvector）：

| 配置项 | 推荐值 | 说明 |
| :--- | :--- | :--- |
| Production branch | `main` | 由 GitHub 推送自动触发部署 |
| Build command | `npm run build-only` | 仅构建前端静态产物与适配资源 |
| Build output directory | `dist` | Vite 输出目录 |
| `NODE_VERSION` | `22` | 匹配 `package.json` 引擎要求 |
| `VITE_APP_FEATURE_MODE` | `resume-only` | 隐藏纯前端不可用的 AI 面试与知识库入口 |
| `VITE_RESUME_STORAGE_MODE` | `local` | 跳过无意义 `/api/resumes` 探测，直接启用本地多简历存储 |
| `VITE_AI_PROVIDER_MODE` | `byok` | 启用浏览器自带 API Key / URL 模式优化简历 |

### 绑定 Cloudflare KV 开启短链分享（可选但推荐）

1. 在 Cloudflare 控制台 **Workers & Pages -> KV** 创建一个命名空间（如 `resume-builder-shares`）。
2. 进入当前 Pages 项目的 **Settings -> Functions -> KV namespace bindings**，添加绑定：
   - Variable name：`RESUME_SHARES`
   - KV namespace：选择刚创建的 `resume-builder-shares`
3. 同仓库 `functions/api/shares/[[path]].ts` 与 `functions/api/ai-proxy/chat/completions.ts` 会由 Cloudflare Pages 自动部署，无需额外配置服务器。

> 本地使用 Wrangler 联调 Edge Functions：`npm run build-only && npx wrangler pages dev dist --kv RESUME_SHARES`。真实 KV ID 请在 Cloudflare 控制台绑定，勿把个人 Account ID / KV ID 硬编码提交到 `wrangler.toml`。

---

## 2. 本地浏览器数据的 4 种分享方案对比

当用户简历全部保存在本地浏览器 `localStorage` 中时，项目提供梯度化分享能力：

| 方案 | 原理 | 链接形式 | 头像支持 | 更新/撤回/过期 | 是否需要服务器 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Cloudflare KV 短链分享（主力推荐）** | 点击分享时上传 JSON 快照到 Pages Function + KV，同时本地保存 `manageToken` | `https://域名/share/cf_xxxxxxxxxx` | 支持（建议压缩后随 JSON 存，整份 <= 200KB） | 支持同步更新、一键撤回、7天/30天/永久 | **不需要自购服务器**（利用 Cloudflare KV 免费额度） | 微信/招聘网站投递、需要短链美观与随时撤回 |
| **2. URL Hash 压缩离线分享（零后端兜底）** | 剔除默认值并可选剥离本地大图头像，用浏览器原生 `CompressionStream('deflate-raw')` + Base64URL 编码进 URL Hash | `https://域名/share#d=...`（纯文本约 1.5–4 KB） | 适合外链头像；本地 Base64 大图默认可勾选省略 | 静态快照，不可撤回/原地更新 | **完全零后端**（纯静态站点即可运行） | 未绑定 KV、内网纯静态预览、隐私不上传云端场景 |
| **3. 离线文件导出** | 本地直接生成高清 PDF、压缩 PDF、Markdown 或 JSON | 本地文件 | 完整支持 | 静态文件 | 完全零后端 | 正式附件投递、跨设备备份迁移 |
| **4. 全栈 MySQL 分享** | 复用 `/api/resumes/{id}/share` 写入 MySQL `resume_documents` | `https://域名/share/<token>` | 完整支持 | 自动同步工作区最新保存版本 | 需要全栈后端 + MySQL | 自托管全栈团队/个人环境 |

---

## 3. 安全与防滥用边界

### 3.1 分享接口防护（`functions/api/shares/[[path]].ts`）
- **单份体积限制**：单次 `POST / PUT` 请求体严格限制 `<= 200 KB`，防止塞入超大图片或恶意载荷消耗 KV 配额。
- **管理权隔离**：创建短链时签发 32 位随机 `manageToken`，服务端 KV 仅保存 `SHA-256(manageToken)` 哈希；公开读取接口 `GET /api/shares/:token` 剥离哈希字段，防止任何访问者篡改或删除他人简历。
- **默认 TTL**：提供 7 天、30 天与长期有效选项，推荐默认 30 天自动清理冷数据。
- **生产进阶建议**：若公开站点访问量较大，可在 Cloudflare 控制台为 `POST /api/shares` 绑定 WAF Rate Limiting 规则（例如单 IP 每分钟最多新建 10 次）或接入 Cloudflare Turnstile 人机校验。

### 3.2 BYOK CORS 代理防护（`functions/api/ai-proxy/chat/completions.ts`）
- 默认关闭，仅用户在 `AiConfigDialog` 显式勾选“通过同源边缘代理解决跨域”时才会经过 `/api/ai-proxy/chat/completions`。
- 严格校验 `X-Target-Base-Url` 必须为 `https://`，并拒绝 `localhost`、`127.*`、`0.0.0.0`、`10.*`、`172.16-31.*`、`192.168.*`、`169.254.*`、`::1`、`.local`、`.internal` 等内网/元数据地址（防止 SSRF）。
- 流式直通转发，不写 KV、不打印请求头 `Authorization`。

---

## 4. 如果自建或升级服务器，服务器要求大不大？

| 部署形态 | 典型硬件/云资源需求 | 免费额度 / 参考成本 | 关键瓶颈与说明 |
| :--- | :--- | :--- | :--- |
| **Cloudflare Pages + KV（纯前端 + BYOK + 短链分享）** | **0 台自建服务器** | Cloudflare Pages 静态请求无限免费；Functions 免费 **10 万次/天**；KV 免费 **1GB 存储 + 10 万读/天 + 1000 写/天**（约可存 **5 万份** 20KB 简历）；超额后 Workers Paid **$5/月** 起 | 仅 10ms 免费 CPU 上限在透传 `fetch()` 等待期间不计入，但高并发大量上传建议配 WAF 限流 |
| **自建轻量服务器（仅静态页 + 极简分享接口）** | **1 核 1GB ~ 2 核 2GB**、1–3 Mbps 带宽、20GB 硬盘 | 约 50–100 元/年 | 简历 JSON 仅 5–30KB，几乎不吃 CPU 与内存 |
| **自建 Python AI 全栈（含 AI 面试 + pgvector RAG）** | **2 核 4GB** 起、40GB 硬盘 | 按常规轻量/ECS 计费 | LLM 推理在外部 API，主要内存开销是 MySQL 8.4 + PostgreSQL 17 + FastAPI |
| **自建 Spring AI 全栈（含 Java + MySQL + pgvector）** | **4 核 4GB ~ 4 核 8GB** | 按常规云主机计费 | Java JVM + MySQL 8.4 + pgvector 并行运行，2GB 内存易 OOM |

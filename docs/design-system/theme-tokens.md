<!-- author: Bob -->
# Resume Builder 主题 Token 规范

## 1. 设计目标

Resume Builder 的前端应被设计为一个面向求职准备的专业工作台，而不是普通简历模板展示站。页面需要同时承接简历编辑、模板预览、AI 简历优化、AI 面试与知识库能力，因此视觉系统必须优先服务长期编辑、信息扫描、状态识别和能力边界表达。

默认主题命名为 `Career Blue Light`。

该主题的核心目标是：

- 专业可信：使用职业蓝建立稳定、可靠、面向职场的产品感。
- 清爽高效：以白色面板和冷中性浅灰背景组织复杂信息，降低长时间编辑负担。
- 能力清晰：根据部署模式展示真实可用能力，纯前端模式不暴露后端功能入口。
- 可持续扩展：通过语义化 token 约束颜色、间距、状态与组件风格，避免后续页面各自定义样式。

## 2. 主题定位

`Career Blue Light` 使用职业蓝作为品牌主色，辅以冷中性灰、白色面板和深石墨文字。蓝色只用于关键行动、选中态、重要链接和能力焦点，不应大面积铺满页面。

推荐视觉关键词：

- 职业
- 清晰
- 可信
- 克制
- 效率

不推荐视觉关键词：

- 复古
- 可爱
- 炫技
- 营销
- 重装饰

## 3. Token 分层

主题 token 分三层管理。

### 3.1 Primitive Tokens

Primitive token 记录原始色板、字号、间距等基础值，只作为设计系统内部来源，不建议在业务组件中直接使用。

示例：

```css
--blue-50: #eff6ff;
--blue-100: #dbeafe;
--blue-600: #2563eb;
--blue-700: #1d4ed8;
--blue-800: #1e40af;
```

### 3.2 Semantic Tokens

Semantic token 表达实际语义，是页面和组件优先使用的 token。

示例：

```css
--color-bg-app: #f5f7fb;
--color-text-primary: #172033;
--color-brand: #1d4ed8;
--color-border-default: #d8e0eb;
```

### 3.3 Component Tokens

Component token 表达特定组件的稳定样式契约。第一阶段只建议为按钮、输入框、导航、弹窗、抽屉、标签等高频组件沉淀。

示例：

```css
--button-primary-bg: var(--color-brand);
--button-primary-bg-hover: var(--color-brand-hover);
--input-border-focus: var(--color-brand);
```

## 4. 色彩 Token

### 4.1 Base

```css
--color-bg-app: #f5f7fb;
--color-bg-panel: #ffffff;
--color-bg-subtle: #f8fafc;
--color-bg-elevated: #ffffff;
--color-bg-overlay: rgba(15, 23, 42, 0.42);
```

使用规则：

- `color-bg-app` 用于应用整体背景。
- `color-bg-panel` 用于编辑区、工具区、弹窗和抽屉主体。
- `color-bg-subtle` 用于轻量分组、表头、预览外部工作台背景。
- `color-bg-overlay` 只用于模态遮罩。

### 4.2 Text

```css
--color-text-primary: #172033;
--color-text-secondary: #5f6b7a;
--color-text-tertiary: #8a96a8;
--color-text-disabled: #a7b0bf;
--color-text-inverse: #ffffff;
--color-text-link: #1d4ed8;
```

使用规则：

- 主要标题、正文、表单内容使用 `color-text-primary`。
- 描述、辅助说明、时间、次级状态使用 `color-text-secondary`。
- 占位、弱提示、元信息使用 `color-text-tertiary`。
- 禁用态文字使用 `color-text-disabled`。
- 蓝色链接只用于可点击文本，不用于普通强调文字。

### 4.3 Border

```css
--color-border-subtle: #edf1f7;
--color-border-default: #d8e0eb;
--color-border-strong: #aebdcc;
--color-border-focus: #1d4ed8;
```

使用规则：

- 普通分割线和卡片边界使用 `color-border-default`。
- 大面积页面分区使用 `color-border-subtle`。
- 拖拽、选中、对比明显的边界使用 `color-border-strong`。
- 表单聚焦边框使用 `color-border-focus`。

### 4.4 Brand

```css
--color-brand: #1d4ed8;
--color-brand-hover: #1e40af;
--color-brand-active: #1e3a8a;
--color-brand-subtle: #eff6ff;
--color-brand-muted: #dbeafe;
--color-brand-text: #1e3a8a;
```

使用规则：

- `color-brand` 用于主按钮、当前导航项、模板选中态、关键确认动作。
- `color-brand-subtle` 用于品牌色浅背景，例如选中导航背景、AI 能力提示区。
- `color-brand-muted` 用于较明显但不抢主行动的蓝色背景。
- 禁止把整页背景、整块大面板或大面积装饰改为品牌蓝。

### 4.5 Semantic

```css
--color-info: #2563eb;
--color-info-subtle: #eff6ff;
--color-success: #16a34a;
--color-success-subtle: #ecfdf3;
--color-warning: #d97706;
--color-warning-subtle: #fffbeb;
--color-danger: #dc2626;
--color-danger-subtle: #fef2f2;
```

使用规则：

- `info` 用于说明性系统信息。
- `success` 用于保存成功、导出完成、上传完成。
- `warning` 用于能力降级、配置缺失、远程探测回退。
- `danger` 用于删除、失败、不可恢复错误。

### 4.6 Interaction State

```css
--state-hover-bg: #f1f5f9;
--state-selected-bg: #eff6ff;
--state-selected-border: #1d4ed8;
--state-focus-ring: rgba(29, 78, 216, 0.24);
--state-disabled-bg: #f1f5f9;
--state-disabled-text: #a7b0bf;
```

使用规则：

- 所有可点击元素必须有 hover 和 focus-visible 状态。
- 当前导航、当前模板、当前模块使用 selected 状态，不使用单独手写颜色。
- 禁用状态必须降低对比并阻止误导性 hover。

## 5. 字体 Token

```css
--font-family-sans: "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-size-xs: 12px;
--font-size-sm: 13px;
--font-size-md: 14px;
--font-size-lg: 16px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--line-height-tight: 1.3;
--line-height-normal: 1.55;
--line-height-relaxed: 1.7;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

使用规则：

- 应用外壳默认使用 `font-size-md`。
- 表单标签、按钮、导航项优先使用 `font-size-sm` 或 `font-size-md`。
- 页面主标题使用 `font-size-xl`，避免在工具面板内使用过大的标题。
- 简历模板内部字体可由模板自行控制，但不得影响应用外壳 token。

## 6. 间距 Token

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

使用规则：

- 紧凑工具按钮间距使用 `space-2`。
- 表单字段组间距使用 `space-3` 或 `space-4`。
- 面板内边距使用 `space-4` 或 `space-6`。
- 页面大区块之间使用 `space-8`。

## 7. 圆角 Token

```css
--radius-xs: 4px;
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-full: 9999px;
```

使用规则：

- 按钮、输入框、导航项默认使用 `radius-sm` 或 `radius-md`。
- 面板、弹窗、抽屉使用 `radius-md` 或 `radius-lg`。
- 标签和徽标可使用 `radius-full`。
- 禁止让大面积工作台组件过度圆润，避免削弱专业感。

## 8. 阴影与层级 Token

```css
--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.05);
--shadow-sm: 0 4px 10px rgba(15, 23, 42, 0.06);
--shadow-md: 0 10px 24px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 18px 40px rgba(15, 23, 42, 0.12);

--z-base: 1;
--z-sticky: 20;
--z-popover: 50;
--z-modal: 100;
--z-toast: 120;
```

使用规则：

- 常规面板优先使用边框，不依赖强阴影。
- 悬浮工具栏、弹窗、抽屉可以使用阴影。
- 简历 A4 预览纸张可使用 `shadow-md` 强化纸张层级。

## 9. 部署模式与能力显示规则

前端应按能力展示，而不是把不可用功能置灰留在页面上。

| 能力 | frontend-only | spring-ai | python-ai |
| --- | --- | --- | --- |
| 简历编辑 | 显示 | 显示 | 显示 |
| 模板切换与预览 | 显示 | 显示 | 显示 |
| PDF / Markdown / JSON 导出 | 显示 | 显示 | 显示 |
| JSON 导入 | 显示 | 显示 | 显示 |
| 本地保存 | 显示 | 可显示 | 可显示 |
| 远程多简历保存 | 隐藏 | 显示 | 显示 |
| AI 简历优化 | 隐藏 | 显示 | 显示 |
| AI 面试 | 隐藏 | 显示 | 显示 |
| 知识库 / RAG | 隐藏 | 显示 | 显示 |
| 后端实时语音 | 隐藏 | 显示 | 显示 |
| 后端健康状态 | 隐藏 | 显示 | 显示 |

规则：

- `frontend-only` 模式不展示 AI 面试、知识库、后端语音、远程保存等后端能力入口。
- `spring-ai` 与 `python-ai` 在前端表现上保持一致，不让用户理解为两套不同产品。
- 后端技术栈差异只可出现在设置、诊断或开发信息中，不应成为主导航层级。
- `auto` 存储模式探测远程失败时，可显示“本次使用本地保存”的轻量状态，但不展示不可用的远程操作。

## 10. 页面布局规范

### 10.1 应用外壳

- 使用左侧主导航承载一级工作区。
- 主工作区根据能力分为编辑、预览、AI、知识库等区域。
- 避免营销页式大标题、大插画、大卡片堆叠。

### 10.2 简历编辑页

- 左侧或中左侧展示文档、模块、模块显隐与模块顺序。
- 中间区域承载结构化编辑表单。
- 右侧区域承载 A4 预览、模板切换、缩放和导出。
- 编辑区和预览区应视觉平衡，预览纸张必须有明确边界。

### 10.3 AI 优化

- 轻量优化适合使用右侧抽屉，支持边看简历边优化。
- 完整优化流程可作为独立工作区，展示模块选择、优化目标、流式输出、应用与撤销。
- AI 输出应重视可读性，避免大段文本挤在狭窄容器中。

### 10.4 AI 面试

- 面试页应突出当前问题、回答输入、计时和状态。
- 会话历史、评分和反馈作为辅助信息，不抢当前任务焦点。
- 语音能力应有清楚状态反馈，包括浏览器语音、后端语音、降级原因。

### 10.5 知识库

- 知识库页应突出上传、处理状态、文档列表和检索验证。
- 上传失败、OCR 失败、向量入库失败必须使用明确错误状态。
- 不应把知识库设计成普通文件网盘，重点是服务 RAG 与面试召回。

## 11. 组件规范

### 11.1 Button

- 主按钮只用于一个区域内最重要动作。
- 次按钮用于普通操作。
- 危险按钮只用于删除、清空、终止等高风险动作。
- 图标按钮必须有 hover、focus-visible 与可访问标签。

### 11.2 Input

- 输入框默认白底、浅边框。
- 聚焦时使用职业蓝边框和 focus ring。
- 错误状态使用危险色边框和明确错误文案。

### 11.3 Navigation

- 当前导航项使用 `color-brand-subtle` 背景、`color-brand` 或 `color-brand-text` 文本。
- 导航图标与文本保持一致状态。
- 纯前端模式下不渲染后端能力导航项。

### 11.4 Badge

- 状态标签按语义色使用，不得随意创造新颜色。
- 自动保存、远程保存、本地模式、能力降级等状态应使用 badge 或轻量提示。

### 11.5 Modal 与 Drawer

- Modal 用于阻断式决策，如删除确认、配置保存。
- Drawer 用于辅助流程，如 AI 优化、模板选择、设置。
- 弹层不应嵌套过深，避免遮挡简历编辑主流程。

## 12. 可访问性规则

- 普通正文与背景对比度应至少达到 WCAG 建议的 `4.5:1`。
- 大字号文本与图标状态对比度应至少达到 `3:1`。
- 不得只依靠颜色表达状态，重要状态必须配合文字、图标或边框。
- 所有键盘可聚焦元素必须提供可见 focus 状态。
- 禁用态必须清晰，但不能作为隐藏不可用后端能力的替代方案。

## 13. 禁止事项

- 禁止继续扩大暖棕、米色、复古纸张风格作为应用外壳主题。
- 禁止把后端不可用能力以置灰按钮形式暴露给纯前端用户。
- 禁止在组件中直接散落十六进制色值，应优先使用 semantic token。
- 禁止让页面变成营销落地页风格。
- 禁止大面积使用品牌蓝背景。
- 禁止每个页面单独定义一套按钮、输入框、导航和弹层风格。
- 禁止为了视觉效果破坏简历编辑、预览和导出的稳定性。

## 14. 最佳实践参考

- [Atlassian Design System - Design Tokens](https://atlassian.design/foundations/tokens/design-tokens/)：强调 design token 应按语义使用，并通过主题映射不同 token value。
- [Atlassian Design System - Color](https://atlassian.design/foundations/color/)：提供 neutral、brand、information、success、warning、danger 等颜色角色参考。
- [IBM Carbon Design System - Color](https://carbondesignsystem.com/elements/color/overview/)：强调中性灰、交互状态和主题 token 对企业级产品一致性的作用。
- [Material Design 3 - Color System](https://m3.material.io/styles/color/system/overview)：强调颜色角色、状态层和组件语义。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：对文本对比度、非文本对比度和可访问交互提供基础要求。

# Resume Builder

一个基于 Vue 3 + Vite 的简洁高效的简历生成工具。支持实时编辑、多种导出格式，帮助你快速创建专业的简历。

## 功能特性

- 📝 实时编辑简历内容
- 📄 支持 PDF 导出
- 🎨 多种简历模板
- 💾 本地存储
- 📱 响应式设计

## 技术栈

- **框架**: Vue 3
- **构建工具**: Vite
- **状态管理**: Pinia
- **导出**: html2pdf.js
- **类型检查**: TypeScript
- **代码质量**: ESLint + Oxlint

## 开发环境要求

- Node.js: ^20.19.0 || >=22.12.0
- npm 或 yarn

## 快速开始

### 安装依赖

```sh
npm install
```

### 开发模式

```sh
npm run dev
```

### 生产构建

```sh
npm run build
```

### 预览构建结果

```sh
npm run preview
```

### 代码检查

```sh
npm run lint
```

### 代码格式化

```sh
npm run format
```

## IDE 推荐配置

- [VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- 禁用 Vetur 扩展

## 浏览器支持

- Chromium 系列浏览器（Chrome、Edge、Brave 等）
- Firefox

## 项目结构

```
resume-builder/
├── src/              # 源代码
├── public/           # 静态资源
├── dist/             # 构建输出
├── package.json      # 项目配置
└── vite.config.ts    # Vite 配置
```

## 许可证

MIT

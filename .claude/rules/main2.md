# AI 辅助开发规则

## 工作模式

### 交互模式（默认）

技术选型、多方案、重要决策时使用 `ask_followup_question` 询问。

### 无人值守模式

触发词："进入无人值守模式"

- 直接选择最佳实践，禁用 `ask_followup_question`，自动修复错误

### 谋定而后动

触发词："谋定而后动"、"先讨论"

- 先分析讨论规划，确认方案后再执行

---

## 核心原则

- 辩证客观思考，不盲目执行（除非明确要求）
- 避免过度设计，以项目目标为准
- 修改代码前必须先读取文件
- 编译通过 ≠ 运行正常，必须实际验证

---

## 执行权限

### 自动执行（无需询问）

- ✅ 创建、修改项目文件（.vue、.ts、.json 等）
- ✅ 代码重构、运行 ESLint --fix、Prettier 格式化
- ✅ 安装开发依赖

### 必须询问确认

- ⚠️ 删除文件、Git 提交/Push
- ⚠️ 修改全局配置（vite.config.ts 等）
- ⚠️ 修改 .env、.claude/rules/ 下的规则文件

### 禁止操作

- 🔒 不提交 .env / 密钥
- 🔒 不操作远端仓库（除 Git Push 需确认外）
- 🔒 不执行破坏性命令（rm -rf 等）

---

## 代码规范

### Git 提交

使用 Conventional Commits + 中文：

| 前缀        | 用途          |
| ----------- | ------------- |
| `feat:`     | 新功能        |
| `fix:`      | 修复 bug      |
| `docs:`     | 文档变更      |
| `refactor:` | 重构          |
| `chore:`    | 构建/工具变更 |
| `style:`    | 样式/格式调整 |

### 命名规范

| 类型         | 风格               | 示例              |
| ------------ | ------------------ | ----------------- |
| 变量/函数    | `camelCase`        | `getUserInfo`     |
| 类/接口/组件 | `PascalCase`       | `UserProfile`     |
| 常量         | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT` |
| Store        | `useXxxStore`      | `useUserStore`    |
| Composables  | `useXxx`           | `useAuth`         |

### Vue 规范

- 标签顺序：`<template>` → `<script>` → `<style>`
- Props 必须定义类型和默认值
- 使用 `const` 优先，避免 `var`
- 文件名使用 `PascalCase`（如 `UserProfile.vue`）

### 代码质量

- **ESLint 只检查当前修改的文件**：`npx eslint <文件路径> --fix`，避免检查整个项目导致超时
- 遵循单一职责原则、DRY 原则
- 3+ 次重复考虑提取，5+ 次重复考虑封装
- 辩证思考，避免为复用而复用

---

## 项目架构

```
components/     # 公共组件（PascalCase 命名）
pages/          # 页面
stores/         # Pinia 状态管理
hook/           # Composables
service/        # API 服务
utils/          # 工具函数
locale/         # 国际化
```

---

## 样式规范

- 优先使用 Tailwind CSS 工具类，复杂样式才用 `<style scoped>`
- 响应式断点：`lg:`, `2xl:`
- 自定义值：`w-[270px]`
- 当前项目不需要加 `portrait:` 断点

---

## 验证流程（DoD）

**核心：实际运行成功才算完成**

1. 代码完成 + 编译通过
2. 运行开发服务（`npm run dev:*`）→ 查看日志（`npm run logcat:*`）→ 确认功能生效
3. 无运行错误
4. 记录经验教训（如有）

### 调试流程

编译器日志（语法错误）→ 运行日志 `npm run logcat:*`（运行时错误）→ 定位修复

---

## 经验教训记录

### 时机

达到 DoD 后立即主动记录（禁止未验证前记录）

### 值得记录的内容

- 非显而易见的技术问题及解决方案
- 容易踩的坑及规避方法
- 性能优化、调试技巧
- 框架/库的特殊用法

记录到 `.claude/rules/lessons-learned.md` 并注明验证方式。

---

## 技术栈

Vue 3.5 + TypeScript 5 + UniApp 3 + Pinia 2 + Tailwind CSS 3 + Leaflet + Three.js + MQTT

---

_规则版本：v2.0 | 最后更新：2026-05-27_

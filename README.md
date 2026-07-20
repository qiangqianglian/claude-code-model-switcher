# CC 模型配置切换（纯前端）

本地网站，用于管理并一键切换 Claude Code 的模型配置（写入 `~/.claude/settings.json` 的 `env` 块）。零后端代码。

## 浏览器要求

- 必须用 **Edge 或 Chrome**（需要 File System Access API）
- 必须通过 `http://localhost` 访问，**不要直接双击 HTML 用 file:// 打开**（API 在 file:// 下不可用）

## 启动

```bash
cd e:\my\ai\更换当前cc的模型网站
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 使用

1. 点「选择 .claude 文件夹」→ 选中 `C:\Users\<你>\.claude` → 浏览器弹窗允许读写权限
2. 顶部会显示当前 `settings.json` 的 env 概览（Token 默认打码）
3. 「+ 新建配置」填入预设（或先连接后用「从当前 settings.json 导入」一键生成预设）
4. 列表里点某张卡片的「激活」→ 自动备份原文件到 `backups\` 并替换 `env`，保留 `permissions`、`effortLevel` 等其它字段

## 数据存储

- 预设：浏览器 `localStorage`
- 目录授权句柄：`IndexedDB`（刷新页面无需重选目录，只需再点一次按钮授予权限）
- 切换前自动备份：`~/.claude/backups/settings-YYYYMMDD-HHmmss.json`

## 构建

```bash
npm run build      # 产物在 dist/
npm run preview    # 预览构建结果（仍需 http://localhost 访问）
```

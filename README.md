# CC 模型配置切换（Electron 桌面端）

桌面应用，用于管理并一键切换 Claude Code 的模型配置（写入 `~/.claude/settings.json` 的 `env` 块）。主进程用 Node `fs` 直接读写，无需启动任何服务、无浏览器授权弹窗。

## 功能

- 新建 / 编辑 / 删除 多套配置预设（存在 `userData/presets.json`）
- 一条配置可挂**多个模型 ID**，卡片上每个模型一个按钮，**点哪个激活哪个**
- 激活时自动备份原文件到 `~/.claude/backups/`，再替换 `env`（保留 `permissions`、`effortLevel` 等）
- 自动识别并高亮「当前生效」的配置 + 模型

## 开发

```bash
cd e:\my\ai\更换当前cc的模型网站
npm install
npm run dev        # 同时起 Vite + Electron，热更新
```

仅需调试前端（不开 Electron）：`npm run dev:web`，浏览器开 `http://localhost:5173`（此模式下激活不可用，预设退化为 localStorage）。

## 打包成 .exe

```bash
npm run package      # vite build + electron-builder
```

产物在 `release/CC模型配置切换.exe`（portable，双击即用，无需安装）。

如需生成安装版，把 `package.json` 里 `build.win.target` 改为 `["nsis"]`。

## 数据位置

- 预设：`C:\Users\<你>\AppData\Roaming\cc-model-switcher\presets.json`
- 目标文件：`C:\Users\<你>\.claude\settings.json`
- 备份：`C:\Users\<你>\.claude\backups\settings-YYYYMMDD-HHmmss.json`

> 切换配置只影响**新开的** Claude Code 会话，当前正在运行的会话不会中途换模型。

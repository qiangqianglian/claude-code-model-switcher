# Claude Code Model Switcher

> 仓库名：`claude-code-model-switcher` ｜ 中文名：CC 模型配置切换

一个用于**管理并一键切换 Claude Code 模型配置**的 Electron 桌面应用。

它直接读写 `~/.claude/settings.json` 的 `env` 块：把每一套「配置预设」（Base URL + Auth Token + 一组模型 ID）保存为本地文件，切换时点一下按钮即可生效。全程无需手动编辑 JSON、无需启动任何本地服务、也没有浏览器授权弹窗。

---

## 目录

- [为什么需要它](#为什么需要它)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [快速开始（开发）](#快速开始开发)
- [打包成可执行文件](#打包成可执行文件)
- [数据与文件位置](#数据与文件位置)
- [目录结构](#目录结构)
- [工作原理](#工作原理)
- [注意事项](#注意事项)
- [路线图](#路线图)
- [License](#license)

---

## 为什么需要它

Claude Code 通过 `~/.claude/settings.json` 的 `env` 块决定「连哪个中转站、用哪个模型」。当你同时使用多个模型服务（例如官方 API、DeepSeek、GLM 等）时，手动改这个 JSON 既繁琐又容易出错：要同时改 `ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN` 以及一堆 `*_MODEL` 字段。

本工具把这件事变成「点一下」。

## 核心特性

- **多套配置预设**：新建 / 编辑 / 删除任意数量的预设，数据保存在本机。
- **一套配置挂多个模型 ID**：每个预设可关联多个模型；卡片上**每个模型一个按钮，点哪个激活哪个**。
- **一键激活 + 自动备份**：激活时先把原 `settings.json` 备份到 `backups/`，再替换 `env` 块（`permissions`、`effortLevel` 等其它字段原样保留）。
- **原子写入**：写文件采用「先写临时文件再 rename」的方式，降低写坏配置的风险。
- **当前状态高亮**：自动识别并高亮「当前生效」的预设与模型；若当前模型不在任何预设里，会明确提示。
- **自定义配置文件路径**：可指定使用哪个 `settings.json`（默认 `~/.claude/settings.json`），方便多环境 / 多账号切换。
- **一键导入**：可把当前 `settings.json` 的配置直接导入为一个新预设。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面容器 | Electron 31 |
| 构建 / 开发服务器 | Vite 5 |
| 界面 | React 18 |
| 打包 | electron-builder |
| 文件读写 | Node.js `fs`（主进程） |

## 快速开始（开发）

> 需要 Node.js 18+ 与 npm。

```bash
# 1. 安装依赖
npm install

# 2. 同时启动 Vite + Electron（带热更新）
npm run dev
```

若只想调试前端界面、不启动 Electron：

```bash
npm run dev:web
# 浏览器打开 http://localhost:5173
```

> 注意：在 `dev:web` 纯浏览器模式下，**激活功能不可用**，预设数据会退化为浏览器 `localStorage`，仅用于前端调试。

## 打包成可执行文件

```bash
npm run package      # vite build + electron-builder
```

产物输出到 `release/` 目录（默认 `win.target = ["dir"]`，即免安装的目录版，双击目录内的可执行文件即可运行）。

如需生成安装包（安装向导版），把 `package.json` 中 `build.win.target` 改为 `["nsis"]` 再执行打包。

## 数据与文件位置

| 内容 | 位置 |
|------|------|
| 预设数据 | `<程序所在目录>/data/presets.json` |
| 应用配置（自定义 settings 路径） | `<程序所在目录>/data/config.json` |
| 目标配置文件 | `C:\Users\<你>\.claude\settings.json`（可用界面切换） |
| 激活前备份 | `<目标文件所在目录>/backups/settings-YYYYMMDD-HHmmss.json` |

「程序所在目录」的判定：

- **portable 打包**：使用可执行文件真实所在目录（`PORTABLE_EXECUTABLE_DIR`）；
- **其它打包方式**：可执行文件所在目录；
- **开发模式**：项目根目录（`app.getAppPath()`）。

数据与程序同行，方便查看、备份和整体携带。程序启动时会自动把旧版本存放在 `userData`（AppData）里的数据迁移过来。

## 目录结构

```
.
├── electron/
│   ├── main.cjs        # 主进程：窗口 + IPC，直接读写 settings.json / presets.json
│   └── preload.cjs     # 通过 contextBridge 暴露安全的 IPC API
├── src/
│   ├── App.jsx         # 主界面
│   ├── api/            # 前端调用层（IPC；纯浏览器下退化为 localStorage）
│   └── components/     # ActivePanel / PresetCard / PresetForm
├── scripts/
│   ├── launch-electron.cjs
│   └── package.cjs
├── docs/               # 项目文档（SOP 等）
├── data/               # 运行时数据（已被 .gitignore 忽略）
├── index.html
├── vite.config.js
└── package.json
```

## 工作原理

1. 每个预设包含：`name`（名称）、`baseUrl`、`authToken`、`models`（模型 ID 列表）。
2. 点击某个预设的某个模型按钮时，主进程执行：
   - 读取当前 `settings.json`；
   - 将其备份到 `backups/`；
   - 用新值覆盖 `env` 块——写入 `ANTHROPIC_AUTH_TOKEN`、`ANTHROPIC_BASE_URL`，并把以下 6 个字段统一填为该模型 ID：
     `ANTHROPIC_MODEL`、`ANTHROPIC_SMALL_FAST_MODEL`、`ANTHROPIC_DEFAULT_HAIKU_MODEL`、`ANTHROPIC_DEFAULT_SONNET_MODEL`、`ANTHROPIC_DEFAULT_OPUS_MODEL`、`CLAUDE_CODE_SUBAGENT_MODEL`；
   - 原子写回文件。
3. 界面重新读取 `settings.json`，高亮当前生效的预设与模型。

> 切换配置只影响**新开的** Claude Code 会话，当前正在运行的会话不会中途换模型。

## 注意事项

- **预设中的 Auth Token 以明文保存在 `data/presets.json`**，请勿把该目录提交到版本库或分享给他人。仓库的 `.gitignore` 已默认忽略 `data/`。
- 不同中转站的模型 ID 命名可能不同，请以服务商文档为准填写。
- 应用数据跟随程序目录，移动程序目录时数据会一起移动；如需单独备份，请打包 `data/` 目录。

## 路线图

见 [`BACKLOG.md`](./BACKLOG.md)。

## License

尚未指定。如需开源，可在此补充 `MIT` 等许可证。
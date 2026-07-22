// 读取当前 settings.json 状态 + 激活预设 + 路径切换 —— 走 Electron IPC
// 主进程用 Node fs 直接读写（默认 ~/.claude/settings.json，可由用户切换）

export async function readStatus() {
  if (window.api?.settings) return window.api.settings.status()
  return { settings: null, env: null, active: null, error: 'web-mode' }
}

export async function activate({ baseUrl, authToken, model }) {
  if (window.api?.settings) return window.api.settings.activate({ baseUrl, authToken, model })
  throw new Error('web-mode 不支持激活，请在桌面端使用')
}

export async function pathInfo() {
  if (window.api?.settings) return window.api.settings.pathInfo()
  return { path: '(web 模式)', isDefault: true }
}

export async function pickFile() {
  if (window.api?.settings) return window.api.settings.pickFile()
  throw new Error('web-mode 不支持选择文件')
}

export async function resetPath() {
  if (window.api?.settings) return window.api.settings.resetPath()
  return { path: '(web 模式)', isDefault: true }
}

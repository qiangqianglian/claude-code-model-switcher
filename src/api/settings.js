// 读取当前 settings.json 状态 + 激活预设 —— 走 Electron IPC
// 主进程用 Node fs 直接读写 ~/.claude/settings.json（无授权弹窗、无 File System Access）

export async function readStatus() {
  if (window.api?.settings) return window.api.settings.status()
  // dev:web 退化：无文件访问能力
  return { settings: null, env: null, active: null, error: 'web-mode' }
}

export async function activate({ baseUrl, authToken, model }) {
  if (window.api?.settings) return window.api.settings.activate({ baseUrl, authToken, model })
  throw new Error('web-mode 不支持激活，请在桌面端使用')
}

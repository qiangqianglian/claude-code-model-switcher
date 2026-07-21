// 预设 CRUD —— 走 Electron IPC（主进程存 userData/presets.json）
// 在纯浏览器（dev:web）下退化为 localStorage，便于仅前端调试

const LS_KEY = 'cc-model-presets'

function hasIPC() {
  return typeof window !== 'undefined' && window.api?.presets
}

function lsLoad() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function lsSave(presets) {
  localStorage.setItem(LS_KEY, JSON.stringify(presets))
}

export async function listPresets() {
  if (hasIPC()) return window.api.presets.list()
  return lsLoad()
}

export async function createPreset(data) {
  if (hasIPC()) return window.api.presets.create(data)
  const arr = lsLoad()
  const preset = {
    id: crypto.randomUUID(),
    name: (data.name || '').trim() || '未命名配置',
    baseUrl: (data.baseUrl || '').trim(),
    authToken: (data.authToken || '').trim(),
    models: (data.models || []).filter(Boolean),
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  const next = [preset, ...arr]
  lsSave(next)
  return next
}

export async function updatePreset(id, data) {
  if (hasIPC()) return window.api.presets.update(id, data)
  const next = lsLoad().map((p) =>
    p.id === id
      ? { ...p, name: (data.name || '').trim() || p.name, baseUrl: data.baseUrl, authToken: data.authToken, models: data.models, updatedAt: Date.now() }
      : p
  )
  lsSave(next)
  return next
}

export async function deletePreset(id) {
  if (hasIPC()) return window.api.presets.remove(id)
  const next = lsLoad().filter((p) => p.id !== id)
  lsSave(next)
  return next
}

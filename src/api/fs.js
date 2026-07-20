// File System Access API 封装：读写 ~/.claude/settings.json，自动备份
// 仅 Chromium (Edge/Chrome) 在 secure context (http://localhost / https) 下可用

const DB_NAME = 'cc-model-switcher'
const DB_STORE = 'handles'
const HANDLE_KEY = 'claude-dir'

// ---------- IndexedDB：持久化 directory handle ----------

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const req = tx.objectStore(DB_STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbDel(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ---------- 能力检测 ----------

export function isSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

// ---------- 连接 / 恢复 目录 ----------

export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'claude-dir' })
  await idbSet(HANDLE_KEY, handle)
  return handle
}

// 刷新页面后从 IndexedDB 恢复句柄（句柄在，但权限可能需要重新授予）
export async function restoreFolder() {
  const handle = await idbGet(HANDLE_KEY)
  if (!handle) return null
  return handle
}

export async function forgetFolder() {
  await idbDel(HANDLE_KEY)
}

// 句柄权限可能是 'granted' / 'prompt' / 'denied'；prompt 时需用户点击触发 requestPermission
export async function getPermission(handle) {
  if (!handle) return 'denied'
  const opts = { mode: 'readwrite' }
  if ((await handle.queryPermission?.(opts)) === 'granted') return 'granted'
  return handle.queryPermission ? await handle.queryPermission(opts) : 'prompt'
}

export async function requestPermission(handle) {
  return handle.requestPermission?.({ mode: 'readwrite' }) ?? 'denied'
}

// ---------- 读 / 写 settings.json ----------

async function getSettingsFileHandle(dirHandle, create = false) {
  return dirHandle.getFileHandle('settings.json', { create })
}

export async function readSettings(dirHandle) {
  const fileHandle = await getSettingsFileHandle(dirHandle, false)
  const file = await fileHandle.getFile()
  const text = await file.text()
  return JSON.parse(text)
}

// 健壮写入：createWritable 会校验句柄缓存的文件状态，跨操作复用的目录句柄
// 可能因上一次写入导致缓存过期，抛 "state cached ... had changed"。
// 解决：每次重新 getFileHandle，写之前 getFile() 刷新缓存，并加一次重试。
async function writeTextFile(dirHandle, name, text, { create = true } = {}) {
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fh = await dirHandle.getFileHandle(name, { create })
      // 刷新句柄内部缓存的文件状态（消除「state had changed」错误）
      await fh.getFile().catch(() => {})
      const writable = await fh.createWritable()
      await writable.write(text)
      await writable.close()
      return
    } catch (e) {
      lastErr = e
      // 重试前等一帧，让磁盘状态稳定后重新 getFileHandle 拿新状态
      await new Promise((r) => setTimeout(r, 60))
    }
  }
  throw lastErr
}

export async function writeSettings(dirHandle, obj) {
  await writeTextFile(dirHandle, 'settings.json', JSON.stringify(obj, null, 2), { create: true })
}

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
    '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds())
  )
}

// ---------- 备份 + 激活 ----------

// 把预设 env 写入 settings.json，保留其它字段；切换前先备份
export async function backupAndActivate(dirHandle, env) {
  const current = await readSettings(dirHandle)
  // 备份到 backups/settings-YYYYMMDD-HHmmss.json
  const backupsDir = await dirHandle.getDirectoryHandle('backups', { create: true })
  await writeTextFile(backupsDir, `settings-${timestamp()}.json`, JSON.stringify(current, null, 2), { create: true })
  // 替换 env，保留其余字段
  const next = { ...current, env: { ...env } }
  await writeSettings(dirHandle, next)
  return next
}

// ---------- 当前生效检测 ----------

const MODEL_FIELDS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL'
]

// 返回 { presetId, model, known }：
//   presetId/url+token 匹配到的预设 id；model=当前 6 个 *_MODEL 共有的值；
//   known=该 model 是否在预设的 models 列表里（false 时 UI 提示「未加入预设」）
// 全不匹配返回 null。
export async function detectActive(dirHandle, presets) {
  let current
  try {
    current = await readSettings(dirHandle)
  } catch {
    return null
  }
  const curEnv = current.env || {}

  // 6 个 *_MODEL 是否同值，取出该共同值
  const vals = MODEL_FIELDS.map((k) => curEnv[k]).filter((v) => v !== undefined && v !== '')
  const sameModel = vals.length > 0 && vals.every((v) => v === vals[0])
  const curModel = sameModel ? vals[0] : null

  for (const p of presets) {
    if (p.baseUrl === curEnv.ANTHROPIC_BASE_URL && p.authToken === curEnv.ANTHROPIC_AUTH_TOKEN) {
      return {
        presetId: p.id,
        model: curModel,
        known: curModel ? p.models.includes(curModel) : false
      }
    }
  }
  return null
}


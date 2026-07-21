// Electron 主进程：窗口 + IPC（直接用 Node fs 读写 ~/.claude/settings.json 和 presets.json）
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')
const BACKUPS_DIR = path.join(CLAUDE_DIR, 'backups')

// 6 个 *_MODEL 字段统一填同一个模型 ID
const MODEL_FIELDS = [
  'ANTHROPIC_MODEL',
  'ANTHROPIC_SMALL_FAST_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'CLAUDE_CODE_SUBAGENT_MODEL'
]

function makeEnv({ baseUrl, authToken, model }) {
  const env = {
    ANTHROPIC_AUTH_TOKEN: authToken,
    ANTHROPIC_BASE_URL: baseUrl
  }
  for (const f of MODEL_FIELDS) env[f] = model
  return env
}

function presetsPath() {
  return path.join(app.getPath('userData'), 'presets.json')
}

// ---------- 预设 CRUD（presets.json） ----------

function readPresets() {
  try {
    const raw = fs.readFileSync(presetsPath(), 'utf-8')
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writePresets(presets) {
  fs.mkdirSync(path.dirname(presetsPath()), { recursive: true })
  fs.writeFileSync(presetsPath(), JSON.stringify(presets, null, 2), 'utf-8')
}

function cleanModels(models) {
  const arr = (models || [])
    .map((m) => String(m).trim())
    .filter((m) => m.length > 0)
  return arr.filter((m, i) => arr.indexOf(m) === i)
}

function presetFromData(data, base = {}) {
  return {
    id: base.id || crypto.randomUUID(),
    name: (data.name || '').trim() || '未命名配置',
    baseUrl: (data.baseUrl || '').trim(),
    authToken: (data.authToken || '').trim(),
    models: cleanModels(data.models),
    createdAt: base.createdAt || Date.now(),
    updatedAt: Date.now()
  }
}

// ---------- settings.json 读写 ----------

function readSettings() {
  const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeSettings(obj) {
  // 原子写入：先写临时文件再 rename
  const tmp = SETTINGS_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf-8')
  fs.renameSync(tmp, SETTINGS_FILE)
}

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
    '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds())
  )
}

// 备份当前 settings.json，再用新 env 覆盖（保留其它字段）
function backupAndActivate(env) {
  const current = readSettings()
  fs.mkdirSync(BACKUPS_DIR, { recursive: true })
  const backupFile = path.join(BACKUPS_DIR, `settings-${timestamp()}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(current, null, 2), 'utf-8')
  const next = { ...current, env: { ...env } }
  writeSettings(next)
  return next
}

// 读当前 settings.json + 检测匹配的预设/模型
function readStatus() {
  let settings
  try {
    settings = readSettings()
  } catch (e) {
    return { settings: null, env: null, active: null, error: String(e) }
  }
  const env = settings.env || {}
  const presets = readPresets()

  const vals = MODEL_FIELDS.map((k) => env[k]).filter((v) => v !== undefined && v !== '')
  const sameModel = vals.length > 0 && vals.every((v) => v === vals[0])
  const curModel = sameModel ? vals[0] : null

  let active = null
  for (const p of presets) {
    if (p.baseUrl === env.ANTHROPIC_BASE_URL && p.authToken === env.ANTHROPIC_AUTH_TOKEN) {
      active = {
        presetId: p.id,
        model: curModel,
        known: curModel ? p.models.includes(curModel) : false
      }
      break
    }
  }
  return { settings, env, active, error: null }
}

// ---------- IPC ----------

ipcMain.handle('presets:list', () => readPresets())

ipcMain.handle('presets:create', (_e, data) => {
  const presets = readPresets()
  const preset = presetFromData(data)
  const next = [preset, ...presets]
  writePresets(next)
  return next
})

ipcMain.handle('presets:update', (_e, id, data) => {
  const presets = readPresets()
  const next = presets.map((p) => (p.id === id ? presetFromData(data, p) : p))
  writePresets(next)
  return next
})

ipcMain.handle('presets:remove', (_e, id) => {
  const next = readPresets().filter((p) => p.id !== id)
  writePresets(next)
  return next
})

ipcMain.handle('settings:status', () => readStatus())

ipcMain.handle('settings:activate', (_e, { baseUrl, authToken, model }) => {
  const env = makeEnv({ baseUrl, authToken, model })
  backupAndActivate(env)
  return readStatus()
})

// ---------- 窗口 ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

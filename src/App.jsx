import React, { useEffect, useState, useCallback } from 'react'
import {
  isSupported,
  pickFolder,
  restoreFolder,
  forgetFolder,
  getPermission,
  requestPermission,
  readSettings,
  backupAndActivate,
  detectActive
} from './api/fs.js'
import {
  loadPresets,
  createPreset,
  updatePreset,
  deletePreset,
  makeEnv
} from './api/presets.js'
import FolderConnect from './components/FolderConnect.jsx'
import ActivePanel from './components/ActivePanel.jsx'
import PresetCard from './components/PresetCard.jsx'
import PresetForm from './components/PresetForm.jsx'

export default function App() {
  const [supported] = useState(isSupported())
  const [dirHandle, setDirHandle] = useState(null)
  const [permission, setPermission] = useState('prompt')
  const [presets, setPresets] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null) // 当前 settings.json 的 env
  const [active, setActive] = useState(null)        // { presetId, model, known } | null
  const [editing, setEditing] = useState(null)      // null | 'new' | preset对象
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  // 初次加载：预设 + 恢复目录句柄
  useEffect(() => {
    setPresets(loadPresets())
    ;(async () => {
      const h = await restoreFolder()
      if (h) {
        setDirHandle(h)
        setPermission(await getPermission(h))
      }
    })()
  }, [])

  const refreshActive = useCallback(async (handle) => {
    if (!handle) return
    try {
      const settings = await readSettings(handle)
      setCurrentEnv(settings.env || {})
    } catch (e) {
      setCurrentEnv(null)
    }
    const a = await detectActive(handle, loadPresets())
    setActive(a)
  }, [])

  // 权限/句柄变化时刷新当前生效
  useEffect(() => {
    if (dirHandle && permission === 'granted') {
      refreshActive(dirHandle)
    } else {
      setCurrentEnv(null)
      setActive(null)
    }
  }, [dirHandle, permission, refreshActive])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleConnect() {
    setError('')
    try {
      const h = await pickFolder()
      setDirHandle(h)
      setPermission(await getPermission(h))
      flash('已连接文件夹')
    } catch (e) {
      if (e?.name !== 'AbortError') setError('连接失败：' + (e.message || e))
    }
  }

  async function handleRegrant() {
    if (!dirHandle) return
    const p = await requestPermission(dirHandle)
    setPermission(p)
    if (p !== 'granted') setError('未授予写权限，无法切换配置')
  }

  async function handleDisconnect() {
    await forgetFolder()
    setDirHandle(null)
    setPermission('prompt')
    setCurrentEnv(null)
    setActive(null)
    flash('已断开连接')
  }

  // 点某个模型按钮：用该模型 ID 构造 env 并写入 settings.json
  async function handleActivate(preset, modelId) {
    setError('')
    if (!dirHandle || permission !== 'granted') {
      setError('请先连接并授权 .claude 文件夹')
      return
    }
    setBusy(true)
    try {
      const env = makeEnv({ baseUrl: preset.baseUrl, authToken: preset.authToken, model: modelId })
      await backupAndActivate(dirHandle, env)
      await refreshActive(dirHandle)
      flash(`已激活：${preset.name} · ${modelId}`)
    } catch (e) {
      setError('激活失败：' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  function handleSaveForm(data) {
    if (editing && editing.id) {
      setPresets(updatePreset(presets, editing.id, data))
      if (dirHandle && permission === 'granted') refreshActive(dirHandle)
      flash('已保存修改')
    } else {
      setPresets(createPreset(presets, data))
      flash('已新建配置')
    }
    setEditing(null)
  }

  function handleDelete(preset) {
    if (!window.confirm(`确定删除「${preset.name}」？此操作不可撤销。`)) return
    setPresets(deletePreset(presets, preset.id))
    flash('已删除')
  }

  function handleImportCurrent() {
    if (!currentEnv) return
    setEditing({
      id: null,
      _import: true,
      name: '',
      baseUrl: currentEnv.ANTHROPIC_BASE_URL || '',
      authToken: currentEnv.ANTHROPIC_AUTH_TOKEN || '',
      models: currentEnv.ANTHROPIC_MODEL ? [currentEnv.ANTHROPIC_MODEL] : []
    })
  }

  const connected = dirHandle && permission === 'granted'

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Code 模型配置切换</h1>
        <p className="subtitle">本地纯前端 · 数据不出本机</p>
      </header>

      {!supported && (
        <div className="banner banner-error">
          当前浏览器不支持 File System Access API。请用 <b>Edge</b> 或 <b>Chrome</b> 打开
          <code>http://localhost:5173</code>（不要用 file:// 直接打开）。
        </div>
      )}

      <FolderConnect
        dirHandle={dirHandle}
        permission={permission}
        onConnect={handleConnect}
        onRegrant={handleRegrant}
        onDisconnect={handleDisconnect}
        disabled={!supported}
      />

      {error && <div className="banner banner-error">{error}</div>}
      {toast && <div className="banner banner-info">{toast}</div>}

      <ActivePanel
        currentEnv={currentEnv}
        active={active}
        presets={presets}
        onImport={handleImportCurrent}
      />

      <section className="presets-section">
        <div className="section-head">
          <h2>我的配置（{presets.length}）</h2>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + 新建配置
          </button>
        </div>

        {presets.length === 0 ? (
          <div className="empty">
            还没有配置。点击「新建配置」，或先连接文件夹后用「从当前 settings.json 导入」。
          </div>
        ) : (
          <div className="preset-grid">
            {presets.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                active={active}
                connected={connected}
                busy={busy}
                onActivate={handleActivate}
                onEdit={() => setEditing(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        )}
      </section>

      {editing && (
        <PresetForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={handleSaveForm}
        />
      )}
    </div>
  )
}

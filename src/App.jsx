import React, { useEffect, useState, useCallback } from 'react'
import { listPresets, createPreset, updatePreset, deletePreset } from './api/presets.js'
import { readStatus, activate, pathInfo, pickFile, resetPath } from './api/settings.js'
import ActivePanel from './components/ActivePanel.jsx'
import PresetCard from './components/PresetCard.jsx'
import PresetForm from './components/PresetForm.jsx'

export default function App() {
  const [presets, setPresets] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null) // 当前 settings.json 的 env
  const [active, setActive] = useState(null)        // { presetId, model, known } | null
  const [settingsPath, setSettingsPath] = useState(null)  // { path, isDefault } | null
  const [editing, setEditing] = useState(null)      // null | 'new' | preset对象
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const refresh = useCallback(async () => {
    const [list, status, pi] = await Promise.all([listPresets(), readStatus(), pathInfo()])
    setPresets(list)
    setCurrentEnv(status.env)
    setActive(status.active)
    setSettingsPath(pi)
    if (status.error && status.error !== 'web-mode') setError(status.error)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // 点某个模型按钮：主进程备份 + 写入 settings.json
  async function handleActivate(preset, modelId) {
    setError('')
    setBusy(true)
    try {
      const status = await activate({
        baseUrl: preset.baseUrl,
        authToken: preset.authToken,
        model: modelId
      })
      setCurrentEnv(status.env)
      setActive(status.active)
      flash(`已激活：${preset.name} · ${modelId}`)
    } catch (e) {
      setError('激活失败：' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveForm(data) {
    setError('')
    try {
      if (editing && editing.id) {
        const next = await updatePreset(editing.id, data)
        setPresets(next)
        flash('已保存修改')
      } else {
        const next = await createPreset(data)
        setPresets(next)
        flash('已新建配置')
      }
      // 重新检测当前生效（预设改动可能影响匹配）
      const status = await readStatus()
      setActive(status.active)
    } catch (e) {
      setError('保存失败：' + (e.message || e))
    }
    setEditing(null)
  }

  async function handleDelete(preset) {
    if (!window.confirm(`确定删除「${preset.name}」？此操作不可撤销。`)) return
    const next = await deletePreset(preset.id)
    setPresets(next)
    const status = await readStatus()
    setActive(status.active)
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

  async function handlePickFile() {
    setError('')
    try {
      const res = await pickFile()
      if (res) {
        await refresh()
        flash('已切换到：' + res.path)
      }
    } catch (e) {
      setError('选择文件失败：' + (e.message || e))
    }
  }

  async function handleResetPath() {
    await resetPath()
    await refresh()
    flash('已恢复默认路径')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Claude Code 模型配置切换</h1>
        <p className="subtitle">桌面端 · 直接读写 ~/.claude/settings.json · 数据存在本机</p>
      </header>

      {error && <div className="banner banner-error">{error}</div>}
      {toast && <div className="banner banner-info">{toast}</div>}

      <ActivePanel
        currentEnv={currentEnv}
        active={active}
        presets={presets}
        pathInfo={settingsPath}
        onPickFile={handlePickFile}
        onResetPath={handleResetPath}
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
            还没有配置。点击「新建配置」，或用「从当前 settings.json 导入」一键生成预设。
          </div>
        ) : (
          <div className="preset-grid">
            {presets.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                active={active}
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

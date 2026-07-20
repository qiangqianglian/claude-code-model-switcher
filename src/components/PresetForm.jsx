import React, { useState, useMemo } from 'react'

export default function PresetForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl || '')
  const [authToken, setAuthToken] = useState(initial?.authToken || '')
  const [models, setModels] = useState(() => {
    const arr = Array.isArray(initial?.models) ? initial.models : []
    return arr.length ? arr : ['']
  })
  const [modelInput, setModelInput] = useState('')

  const isEdit = initial && initial.id

  function addModel() {
    const v = modelInput.trim()
    if (!v) return
    setModels((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setModelInput('')
  }

  function removeModel(i) {
    setModels((prev) => {
      const next = prev.filter((_, idx) => idx !== i)
      return next.length ? next : ['']
    })
  }

  const valid = useMemo(() => {
    const trimmed = models.map((m) => m.trim()).filter(Boolean)
    return name.trim() && baseUrl.trim() && authToken.trim() && trimmed.length >= 1
  }, [name, baseUrl, authToken, models])

  function submit(e) {
    e.preventDefault()
    if (!valid) return
    onSave({ name, baseUrl, authToken, models })
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>{isEdit ? '编辑配置' : initial ? '从当前导入为新预设' : '新建配置'}</h3>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>✕</button>
        </div>

        <label className="field">
          <span>配置名称</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：DeepSeek 服务器" autoFocus />
        </label>

        <label className="field">
          <span>Base URL</span>
          <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.anthropic.com" />
        </label>

        <label className="field">
          <span>Auth Token</span>
          <input type="password" value={authToken} onChange={(e) => setAuthToken(e.target.value)} placeholder="sk-..." />
        </label>

        <div className="field">
          <span>模型 ID 列表（点激活时写入 settings.json 的 6 个 *_MODEL 字段）</span>
          <div className="model-add">
            <input
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addModel()
                }
              }}
              placeholder="例如：deepseek-v4-pro[1m]"
            />
            <button type="button" className="btn btn-ghost" onClick={addModel}>+ 添加</button>
          </div>
          <div className="model-chips">
            {models.map((m, i) => (
              <span className="chip" key={i}>
                {m || '（空）'}
                <button type="button" className="chip-x" onClick={() => removeModel(i)}>✕</button>
              </span>
            ))}
            {models.length === 0 && <span className="muted-sm">至少添加一个模型 ID</span>}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>保存</button>
        </div>
      </form>
    </div>
  )
}

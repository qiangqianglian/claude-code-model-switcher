import React, { useState } from 'react'

function mask(token) {
  if (!token) return '（未设置）'
  const s = String(token)
  if (s.length <= 8) return '••••'
  return s.slice(0, 4) + '••••' + s.slice(-4)
}

// active = { presetId, model, known } | null ; presets 用于查预设名
// pathInfo = { path, isDefault } | null
export default function ActivePanel({ currentEnv, active, presets, pathInfo, onPickFile, onResetPath, onImport }) {
  const [showToken, setShowToken] = useState(false)
  const matched = active ? presets.find((p) => p.id === active.presetId) : null

  const path = pathInfo?.path
  const isDefault = pathInfo?.isDefault ?? true

  // 路径过长时截断中段
  function shortPath(p) {
    if (!p) return ''
    if (p.length <= 56) return p
    return p.slice(0, 24) + '…' + p.slice(-28)
  }

  const pathBar = (
    <div className="path-bar">
      <span className={`path-text ${isDefault ? '' : 'path-custom'}`} title={path || ''}>
        {isDefault ? '默认：' : '自定义：'}{shortPath(path)}
      </span>
      <button className="link" onClick={onPickFile}>更改…</button>
      {!isDefault && <button className="link" onClick={onResetPath}>恢复默认</button>}
    </div>
  )

  if (!currentEnv) {
    return (
      <div className="active-panel muted">
        <div className="active-head">
          <div className="active-title">当前生效配置</div>
        </div>
        {pathBar}
        <div>读取 settings.json 失败或为空。{!isDefault && '可点「恢复默认」换回默认文件，或重新「更改…」。'}</div>
      </div>
    )
  }

  const token = currentEnv.ANTHROPIC_AUTH_TOKEN
  const url = currentEnv.ANTHROPIC_BASE_URL
  const model = active?.model

  return (
    <div className="active-panel">
      <div className="active-head">
        <div className="active-title">当前生效配置</div>
        {active && matched ? (
          active.known ? (
            <span className="tag tag-green">匹配预设：{matched.name} · 模型：{model}</span>
          ) : (
            <span className="tag tag-warn">匹配预设：{matched.name} · 模型：{model}（未加入该预设）</span>
          )
        ) : (
          <span className="tag tag-warn">未匹配已保存预设</span>
        )}
      </div>
      {pathBar}
      <div className="active-grid">
        <div><label>Base URL</label><div className="val">{url || '（未设置）'}</div></div>
        <div><label>Model</label><div className="val">{model || '（不一致或未设置）'}</div></div>
        <div>
          <label>
            Auth Token
            <button className="link" onClick={() => setShowToken((v) => !v)}>
              {showToken ? '隐藏' : '显示'}
            </button>
          </label>
          <div className="val mono">{showToken ? (token || '（未设置）') : mask(token)}</div>
        </div>
      </div>
      <div className="active-actions">
        <button className="btn btn-ghost" onClick={onImport}>从当前 settings.json 导入为预设</button>
      </div>
    </div>
  )
}

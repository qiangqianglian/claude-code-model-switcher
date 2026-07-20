import React, { useState } from 'react'

function mask(token) {
  if (!token) return '（未设置）'
  const s = String(token)
  if (s.length <= 8) return '••••'
  return s.slice(0, 4) + '••••' + s.slice(-4)
}

// active = { presetId, model, known } | null ; presets 用于查预设名
export default function ActivePanel({ currentEnv, active, presets, onImport }) {
  const [showToken, setShowToken] = useState(false)
  const matched = active ? presets.find((p) => p.id === active.presetId) : null

  if (!currentEnv) {
    return (
      <div className="active-panel muted">
        <div className="active-title">当前生效配置</div>
        <div>连接 .claude 文件夹后，这里会显示当前 settings.json 的内容。</div>
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

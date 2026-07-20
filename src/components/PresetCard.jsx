import React from 'react'

export default function PresetCard({ preset, active, connected, busy, onActivate, onEdit, onDelete }) {
  const isActivePreset = active?.presetId === preset.id
  const activeModel = isActivePreset ? active?.model : null

  return (
    <div className={`preset-card ${isActivePreset ? 'is-active' : ''}`}>
      <div className="preset-card-head">
        <span className="preset-name">{preset.name}</span>
        {isActivePreset && <span className="tag tag-green">当前生效</span>}
      </div>
      <div className="preset-url">{preset.baseUrl || '—'}</div>

      <div className="model-buttons">
        <span className="model-label">模型：</span>
        {preset.models.length === 0 && <span className="muted-sm">未配置模型</span>}
        {preset.models.map((m) => {
          const isCur = m === activeModel
          return (
            <button
              key={m}
              className={`btn-model ${isCur ? 'is-cur' : ''}`}
              onClick={() => onActivate(preset, m)}
              disabled={!connected || busy}
              title={!connected ? '请先连接文件夹' : ''}
            >
              {isCur && <span className="cur-dot">●</span>}
              {m}
            </button>
          )
        })}
      </div>

      <div className="preset-actions">
        <button className="btn btn-ghost" onClick={onEdit}>编辑</button>
        <button className="btn btn-danger-ghost" onClick={onDelete}>删除</button>
      </div>
    </div>
  )
}

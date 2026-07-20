import React from 'react'

export default function FolderConnect({ dirHandle, permission, onConnect, onRegrant, onDisconnect, disabled }) {
  const granted = dirHandle && permission === 'granted'

  return (
    <div className={`connect-bar ${granted ? 'connected' : ''}`}>
      {granted ? (
        <>
          <span className="dot" />
          <span className="connect-text">
            已连接：<code>{dirHandle.name}</code>
            {permission !== 'granted' && '（权限待授予）'}
          </span>
          <button className="btn btn-ghost" onClick={onDisconnect}>断开</button>
        </>
      ) : dirHandle ? (
        <>
          <span className="dot dot-warn" />
          <span className="connect-text">
            已选择 <code>{dirHandle.name}</code>，但写权限未授予
          </span>
          <button className="btn btn-primary" onClick={onRegrant}>授予写权限</button>
          <button className="btn btn-ghost" onClick={onDisconnect}>断开</button>
        </>
      ) : (
        <>
          <span className="dot dot-off" />
          <span className="connect-text">未连接文件夹</span>
          <button className="btn btn-primary" onClick={onConnect} disabled={disabled}>
            选择 .claude 文件夹
          </button>
        </>
      )}
    </div>
  )
}

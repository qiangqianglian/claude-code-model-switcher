// preload：通过 contextBridge 暴露安全 IPC API 给渲染层
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  presets: {
    list: () => ipcRenderer.invoke('presets:list'),
    create: (data) => ipcRenderer.invoke('presets:create', data),
    update: (id, data) => ipcRenderer.invoke('presets:update', id, data),
    remove: (id) => ipcRenderer.invoke('presets:remove', id)
  },
  settings: {
    status: () => ipcRenderer.invoke('settings:status'),
    activate: ({ baseUrl, authToken, model }) =>
      ipcRenderer.invoke('settings:activate', { baseUrl, authToken, model }),
    pathInfo: () => ipcRenderer.invoke('settings:pathInfo'),
    pickFile: () => ipcRenderer.invoke('settings:pickFile'),
    resetPath: () => ipcRenderer.invoke('settings:resetPath')
  }
})

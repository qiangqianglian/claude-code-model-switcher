// Electron 启动器
// 某些宿主环境（如 Claude Code）会全局设置 ELECTRON_RUN_AS_NODE=1，导致 electron
// 被当成普通 Node 运行（require('electron') 返回二进制路径字符串、无主进程 API）。
// 这里在启动子进程前删除该变量，确保 electron 以主进程方式启动。
const { spawn } = require('child_process')
const electronPath = require('electron')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env
})

child.on('error', (e) => {
  console.error('启动 electron 失败：', e)
  process.exit(1)
})
child.on('close', (code) => process.exit(code ?? 0))

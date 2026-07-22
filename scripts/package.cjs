// 打包包装脚本
// 1. vite build  2. electron-builder（容忍 winCodeSign 符号链接报错--不影响 exe 生成）
// 3. 校验 exe  4. 把 data/ 拷到 exe 旁边  5. 干净退出
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const WIN_UNPACKED = path.join(ROOT, 'release', 'win-unpacked')
const EXE_NAME = 'CC模型配置切换.exe'
const exePath = path.join(WIN_UNPACKED, EXE_NAME)

function log(msg) { console.log(msg) }

// 手动递归拷贝目录（fs.cpSync 在 Node24/Windows 偶发硬崩，exit 127）
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirSync(s, d)
    else if (entry.isFile()) fs.copyFileSync(s, d)
  }
}

// 1. vite build
log('\n▶ vite build')
const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, shell: true, stdio: 'inherit' })
if (build.status !== 0) {
  console.error('\n✗ vite build 失败 (exit ' + build.status + ')')
  process.exit(1)
}

// 2. electron-builder（忽略退出码：winCodeSign 符号链接错误是无害的，exe 仍会生成）
// 用 pipe 静默捕获输出，避免 inherit 时子进程失败搞坏父进程 stdio（曾导致 node exit 127）
log('\n▶ electron-builder')
const ebLog = path.join(ROOT, '.electron-builder.log')
const eb = spawnSync('npx', ['electron-builder'], {
  cwd: ROOT,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
})
fs.writeFileSync(ebLog, (eb.stdout?.toString() || '') + (eb.stderr?.toString() || ''), 'utf-8')
log('  electron-builder 退出码: ' + eb.status + '（winCodeSign 报错可忽略，见下方校验；完整输出见 .electron-builder.log）')

// 3. 校验 exe
if (!fs.existsSync(exePath)) {
  console.error('\n✗ 未找到 ' + path.relative(ROOT, exePath) + '，打包失败')
  process.exit(1)
}

// 4. 拷贝 data/ 到 exe 旁边
const srcData = path.join(ROOT, 'data')
const dstData = path.join(WIN_UNPACKED, 'data')
if (fs.existsSync(srcData)) {
  try {
    copyDirSync(srcData, dstData)
    log('\n✓ 已复制 data/ -> ' + path.relative(ROOT, dstData))
  } catch (e) {
    log('\n⚠ 复制 data/ 失败（可手动拷）: ' + e.message)
  }
}

const stat = fs.statSync(exePath)
log('\n✓ 打包成功')
log('  产物：' + path.relative(ROOT, exePath))
log('  大小：' + (stat.size / 1024 / 1024).toFixed(1) + ' MB')
log('  数据：' + path.relative(ROOT, dstData) + '/（程序读写这里的 presets.json / config.json）')
log('\n把整个 win-unpacked 文件夹拷到任意位置，双击 ' + EXE_NAME + ' 即可运行。')
// 不调用 process.exit(0)：显式退出会在管道下截断未刷新的 stdout，让 Node 自然退出

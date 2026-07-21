import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Electron 通过 file:// 加载打包产物，必须用相对路径
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    outDir: 'dist'
  }
})

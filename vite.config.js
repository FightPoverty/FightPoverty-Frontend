import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // ← Docker 裡要用 0.0.0.0
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        // 如果有 VITE_API_URL 則優先使用 (前端構建時指定)
        // 否則判斷如果有 DOCKER_ENV 環境變數，代表正在 docker-compose 內，請求需導向 internal service name 'backend'
        // 最後退回給普通的本地 Native Node 開發使用的 'localhost'
        target: process.env.VITE_API_URL || (process.env.DOCKER_ENV ? 'http://backend:3001' : 'http://localhost:3001'),
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
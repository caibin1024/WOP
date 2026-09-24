import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Web 调试：转发到各 AI 供应商真实端点，绕过浏览器 CORS（仅 dev 生效；Android 用 CapacitorHttp 不走这里）
      // rewrite 是必须的：不剥前缀会把 /deepseek 原样前转成 https://api.deepseek.com/deepseek/... → 404
      '/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/deepseek/, '') // /deepseek/chat/completions → /chat/completions
      },
      '/mimo': {
        target: 'https://token-plan-cn.xiaomimimo.com',
        changeOrigin: true,
        secure: true,
        rewrite: p => p.replace(/^\/mimo/, '/v1') // /mimo/chat/completions → /v1/chat/completions（小米真实路径带 /v1）
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})

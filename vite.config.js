import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // Web 调试：转发到 DeepSeek，绕过浏览器 CORS（仅 dev 生效；Android 用 CapacitorHttp 不走这里）
      '/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
})

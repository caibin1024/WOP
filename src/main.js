import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import './styles/main.css'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)
// 主题在 mount 前生效（首帧已由 index.html 内联脚本兜底，这里补系统监听与原生状态栏）
useThemeStore(pinia).init()
app.mount('#app')

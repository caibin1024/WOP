import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * 主题 Store
 * 三档模式：'dark' | 'light' | 'system'（跟随系统），持久化到 localStorage（key wop_theme）。
 * 不用 SQLite：主题必须在首帧前同步生效，localStorage 在浏览器与 Capacitor WebView 都同步可用。
 * 生效方式：documentElement.dataset.theme + CSS 变量覆盖块（main.css 的 html[data-theme="light"]）。
 */
const STORAGE_KEY = 'wop_theme'
const THEME_META = { dark: '#0A0E27', light: '#FFFFFF' }

/**
 * 解析实际生效的主题。
 * ⚠️ 与 index.html 内联脚本的三段逻辑保持一致，修改需两处同步。
 */
function resolveEffective(mode) {
  if (mode === 'dark' || mode === 'light') return mode
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch (e) {
    return 'dark'
  }
}

/** 读取持久化模式，非法值/异常回退「跟随系统」 */
function readStoredMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved
  } catch (e) { /* 隐私模式/清数据时忽略 */ }
  return 'system'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref(readStoredMode())
  const effective = computed(() => resolveEffective(mode.value))

  let mediaQuery = null
  let resumeListener = null
  let _inited = false

  /**
   * 把当前有效主题应用到 DOM（同步）与原生状态栏（异步）。
   * 状态栏注意：@capacitor/status-bar 在 Android 的语义与 iOS 相反——
   * setStyle(Style.Light) → 亮状态栏 → 黑色图标；setStyle(Style.Dark) → 白色图标。
   * 所以深色主题传 Style.Dark（白图标），浅色主题传 Style.Light（深图标）。
   */
  async function apply() {
    const eff = effective.value
    const root = document.documentElement
    root.dataset.theme = eff
    root.style.colorScheme = eff
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_META[eff])
    if (Capacitor.isNativePlatform()) {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true })
        await StatusBar.setStyle({ style: eff === 'dark' ? Style.Dark : Style.Light })
      } catch (e) {
        console.warn('状态栏主题设置失败', e)
      }
    }
  }

  function onSystemChange() {
    // 仅「跟随系统」模式响应系统深浅色切换
    if (mode.value === 'system') apply()
  }

  function setMode(m) {
    if (m !== 'dark' && m !== 'light' && m !== 'system') return
    mode.value = m
    try { localStorage.setItem(STORAGE_KEY, m) } catch (e) { /* 忽略 */ }
    apply()
  }

  function init() {
    if (_inited) return
    _inited = true
    try { apply() } catch (e) { console.warn('主题初始化失败', e) }
    if (window.matchMedia) {
      mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onSystemChange)
      else if (mediaQuery.addListener) mediaQuery.addListener(onSystemChange) // 旧 WebView 兜底
    }
    // 回前台重应用主题：覆盖 MainActivity.onResume 对状态栏的强制（白图标）。
    // 双保险：App 插件 resume 事件 + visibilitychange（原生 WebView 前后台切换可靠触发）。
    // 两处都幂等，重复触发无副作用。init() 在 app.mount 前调用，任何同步抛错都不能阻断挂载，
    // 故全部包在 try/catch 里。
    const onVisible = () => { if (document.visibilityState === 'visible') apply() }
    document.addEventListener('visibilitychange', onVisible)
    if (Capacitor.isNativePlatform()) {
      try {
        App.addListener('resume', onVisible)
          .then(l => { resumeListener = l })
          .catch(() => {})
      } catch (e) { /* App 插件不可用则忽略 */ }
    }
  }

  return { mode, effective, init, apply, setMode }
})

<template>
  <div class="app-shell">
    <main class="page-container">
      <router-view v-if="wizardPhase === 'done'" />
      <!-- 首启检测中：引导不是启动链路的单点，DB 异常也会放行到主界面 -->
      <div v-else-if="wizardPhase === 'checking'" class="empty-state">
        <AppIcon name="dumbbell" :size="28" style="color: var(--text-tertiary)" />
        <p style="margin-top:12px">启动中…</p>
      </div>
    </main>
    <!-- 引导期间 router-view 都没挂载，导航无意义 -->
    <nav v-if="wizardPhase === 'done'" class="bottom-nav">
      <!-- replace：模块间切换不产生返回层级 -->
      <router-link to="/today" replace class="nav-item" active-class="active">
        <AppIcon name="dumbbell" :size="22" />
        <span class="nav-label">今日</span>
      </router-link>
      <router-link to="/history" replace class="nav-item" active-class="active">
        <AppIcon name="chart" :size="22" />
        <span class="nav-label">记录</span>
      </router-link>
      <router-link to="/exercises" replace class="nav-item" active-class="active">
        <AppIcon name="book" :size="22" />
        <span class="nav-label">动作库</span>
      </router-link>
      <router-link to="/aerobic" replace class="nav-item" active-class="active">
        <AppIcon name="heart" :size="22" />
        <span class="nav-label">有氧</span>
      </router-link>
      <router-link to="/body" replace class="nav-item" active-class="active">
        <AppIcon name="scale" :size="22" />
        <span class="nav-label">个人</span>
      </router-link>
    </nav>

    <!-- 首启配置引导（全屏覆盖；重进走设置页自挂，不经过这里） -->
    <OnboardingWizard v-if="wizardPhase === 'show'" mode="firstRun" @finish="wizardPhase = 'done'" />

    <!-- 顶层 Tab 按返回键的「再按一次退出」提示 -->
    <Transition name="exit-fade">
      <div v-if="exitHint" class="exit-hint">再按一次退出</div>
    </Transition>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as AppPlugin } from '@capacitor/app'
import AppIcon from './components/AppIcon.vue'
import OnboardingWizard from './components/OnboardingWizard.vue'
import { useBackStack } from './composables/useBackStack'
import { query } from './database'

const router = useRouter()
const backStack = useBackStack()

// 二级页（模块内下钻）按返回键的路由返回；无可退历史时兜底到父级 Tab
const SECONDARY_PARENT = {
  'history-detail': '/history',
  'exercise-detail': '/exercises',
  'settings': '/today',
  'ai': '/history'
}

// 顶层 Tab「再按一次退出」提示
const exitHint = ref(false)

// 首启引导三态：checking=检测中 / show=弹引导 / done=进主界面（done 后不可逆，重进走设置页自挂）
const wizardPhase = ref('checking')

/**
 * 首启检测：query() 内部自会 initDatabase()，migration_onboard_v1 迁移先跑完再读键。
 * DB 异常不卡死在启动：放行到主界面，引导不是启动链路的单点
 */
async function checkOnboarded() {
  try {
    const rows = await query("SELECT value FROM app_meta WHERE key = 'onboarded'")
    wizardPhase.value = rows.length && rows[0].value === '1' ? 'done' : 'show'
  } catch (e) {
    console.error('首启检测失败', e)
    wizardPhase.value = 'done'
  }
}
let lastBackTime = 0
let hintTimer = null
let backListener = null

// 返回键监听由 App.vue 唯一注册；状态栏主题联动在 src/stores/theme.js（apply 内 setStyle）。
/**
 * 唯一返回键入口（Android）：
 * 1. 先关最上层浮层/内联态（全局返回栈）；2. 二级页 → 路由返回；3. 顶层 Tab → 再按一次退出
 */
async function handleBack() {
  if (backStack.closeTop()) return
  const name = router.currentRoute.value.name
  if (name && SECONDARY_PARENT[name]) {
    if (window.history.length > 1) router.back()
    else router.replace(SECONDARY_PARENT[name])
  } else {
    const now = Date.now()
    if (now - lastBackTime < 5000) {
      lastBackTime = 0
      try { await AppPlugin.exitApp() } catch (e) { /* 退出失败忽略 */ }
    } else {
      lastBackTime = now
      exitHint.value = true
      clearTimeout(hintTimer)
      hintTimer = setTimeout(() => { exitHint.value = false }, 2500)
    }
  }
}

onMounted(async () => {
  checkOnboarded() // fire-and-forget：不阻塞返回键注册
  if (Capacitor.isNativePlatform()) {
    try {
      backListener = await AppPlugin.addListener('backButton', handleBack)
    } catch (e) {
      console.warn('返回键设置失败', e)
    }
  }
})

onBeforeUnmount(() => {
  if (backListener) backListener.remove()
  clearTimeout(hintTimer)
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
}

.page-container {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 顶部安全区由各页 sticky 标题块吸收（.page-header 的 padding-top），此处不再额外留白 */
  padding-bottom: var(--sp-3);
}

.bottom-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 6px 0 calc(6px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  background: var(--nav-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 11px;
  border-radius: var(--radius-sm);
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  transition: color 0.2s var(--easing);
}

.nav-item.active {
  color: var(--accent);
}

.nav-item.active svg {
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2px;
}

.exit-hint {
  position: fixed;
  left: 50%;
  bottom: calc(88px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  transform: translateX(-50%);
  background: var(--hint-bg);
  border: 1px solid var(--border-strong);
  color: var(--hint-text);
  padding: 10px 18px;
  border-radius: 20px;
  font-size: 13px;
  z-index: 1000;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.exit-fade-enter-active,
.exit-fade-leave-active {
  transition: opacity 0.2s var(--easing);
}
.exit-fade-enter-from,
.exit-fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="app-shell">
    <main class="page-container">
      <router-view />
    </main>
    <nav class="bottom-nav">
      <router-link to="/today" class="nav-item" active-class="active">
        <AppIcon name="dumbbell" :size="22" />
        <span class="nav-label">今日</span>
      </router-link>
      <router-link to="/history" class="nav-item" active-class="active">
        <AppIcon name="chart" :size="22" />
        <span class="nav-label">记录</span>
      </router-link>
      <router-link to="/exercises" class="nav-item" active-class="active">
        <AppIcon name="book" :size="22" />
        <span class="nav-label">动作库</span>
      </router-link>
      <router-link to="/aerobic" class="nav-item" active-class="active">
        <AppIcon name="heart" :size="22" />
        <span class="nav-label">有氧</span>
      </router-link>
      <router-link to="/body" class="nav-item" active-class="active">
        <AppIcon name="scale" :size="22" />
        <span class="nav-label">个人</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import AppIcon from './components/AppIcon.vue'

// 全面屏适配：状态栏沉浸式（透明、白字），与深色背景融为一体。
// 注意：@capacitor/status-bar 在 Android 端的语义与 iOS 相反——
// setStyle(Style.Light) → setAppearanceLightStatusBars(true) → 亮状态栏 → 黑色图标（深色背景上看不见）；
// setStyle(Style.Dark) → 非亮 → 白色图标。所以深色 App 要传 Style.Dark。
onMounted(async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true })
      await StatusBar.setStyle({ style: Style.Dark })
    } catch (e) {
      console.warn('状态栏设置失败', e)
    }
  }
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
  background: rgba(10, 14, 39, 0.85);
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
</style>

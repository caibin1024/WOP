<template>
  <div class="exercise-list-view">
    <!-- 冻结块：标题 + 分类筛选条一起固定，列表从下方穿过 -->
    <div class="head-sticky">
      <div class="page-header">
        <h1>动作库</h1>
        <div class="subtitle">{{ exercises.length }} 个动作 · 点击查看教学</div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <div class="filter-row">
      <button v-for="c in categories" :key="c.key" class="filter-chip"
        :class="{ active: activeCat === c.key }" @click="activeCat = c.key">
        {{ c.label }}
      </button>
    </div>
    <!-- 动作列表 -->
    <div class="exercise-grid">
    
      <router-link v-for="e in filteredExercises" :key="e.id" :to="`/exercises/${e.id}`"
                   class="exercise-item card">
        <div class="item-icon" :class="e.isMachine ? 'icon-machine' : 'icon-free'">
          <AppIcon name="dumbbell" :size="20" />
        </div>
        <div class="item-body">
          <div class="item-name">{{ e.name }}</div>
          <div class="item-meta">
            {{ MUSCLE_GROUP_LABELS[e.category] }}
            <span class="tag" :class="e.isMachine ? 'tag-machine' : 'tag-free'">
              {{ e.isMachine ? '器械' : '自由' }}
            </span>
          </div>
        </div>
        <AppIcon name="chevron-right" :size="18" style="color: var(--text-tertiary)" />
      </router-link>
    </div>

    <div v-if="filteredExercises.length === 0" class="empty-state">
      <AppIcon name="book" :size="44" style="color: var(--text-tertiary)" />
      <div style="margin-top:12px">该分类暂无动作</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '../stores/training'
import { MUSCLE_GROUP_LABELS } from '../models'
import AppIcon from '../components/AppIcon.vue'

const training = useTrainingStore()
const activeCat = ref('all')

const categories = [
  { key: 'all', label: '全部' },
  { key: 'shoulder', label: '肩' },
  { key: 'chest', label: '胸' },
  { key: 'back', label: '背' },
  { key: 'biceps', label: '二头' },
  { key: 'triceps', label: '三头' },
  { key: 'legs', label: '腿' },
  { key: 'core', label: '核心' },
  { key: 'warmup', label: '热身' }
]

const exercises = computed(() => training.allExercises)

const filteredExercises = computed(() => {
  if (activeCat.value === 'all') return exercises.value
  return exercises.value.filter(e => e.category === activeCat.value)
})
</script>

<style scoped>
/* 冻结块：标题 + 筛选条一起 sticky。不透明背景与全局 .page-header 一致，整块延伸到屏幕顶端 */
.head-sticky {
  position: sticky;
  top: 0;
  z-index: 40;
  background-color: var(--bg-base);
  background-image: radial-gradient(ellipse 80% 50% at 50% -20%, var(--bg-glow), transparent),
    linear-gradient(180deg, var(--bg-base), var(--bg-deep));
  margin-bottom: 10px;
}
/* 内层标题不再自己 sticky（冻结块整体已固定），背景交给容器；
   底部间距用全局标准值，保持与其它页面 header 高度一致 */
.head-sticky .page-header {
  position: static;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom: none;
  padding-bottom: var(--sp-4);
}
.filter-row {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.filter-row::-webkit-scrollbar {
  display: none;
}
.filter-chip {
  flex-shrink: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: 24px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
  min-height: 40px;
}
.filter-chip.active {
  background: var(--accent);
  color: var(--on-accent);
  border-color: transparent;
  font-weight: 600;
  box-shadow: 0 4px 16px var(--accent-glow);
}
.exercise-grid {
  padding: 0 16px;
}
.exercise-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--text-primary);
  margin-bottom: 8px;
  padding: 12px 16px;
  transition: transform 0.1s, background 0.2s var(--easing);
}
.exercise-item:active {
  transform: scale(0.98);
  background: var(--surface-active);
}
.item-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-machine {
  background: var(--accent-dim);
  color: var(--accent);
}
.icon-free {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success);
}
.item-body {
  flex: 1;
}
.item-name {
  font-size: 15px;
  font-weight: 600;
}
.item-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  display: flex;
  gap: 6px;
  align-items: center;
}
.tag-machine {
  background: var(--accent-dim);
  color: var(--accent-strong);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
}
.tag-free {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success);
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10px;
}
</style>

<template>
  <div class="picker-overlay" @click.self="$emit('close')">
    <div class="picker-sheet">
      <div class="picker-header">
        <div>
          <div class="picker-title">{{ title }}</div>
          <div class="picker-sub" v-if="dayLabel">{{ dayLabel }} · 已在该日的动作已置灰</div>
        </div>
        <button class="picker-close" @click="$emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="picker-body">
        <div v-for="group in grouped" :key="group.category" class="picker-group">
          <div class="picker-group-title">{{ group.label }}</div>
          <div class="picker-items">
            <button
              v-for="e in group.items"
              :key="e.id"
              class="picker-item"
              :disabled="usedIds.has(e.id)"
              @click="$emit('select', e.id)"
            >
              <span class="picker-name">{{ e.name }}</span>
              <span class="picker-type" :class="e.isMachine ? 'm' : 'f'">
                {{ e.isMachine ? '器械' : '自由' }}
              </span>
              <span v-if="usedIds.has(e.id)" class="picker-used">已在该日</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { MUSCLE_GROUP_LABELS } from '../models'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  title: { type: String, default: '选择动作' },
  dayLabel: { type: String, default: '' },
  exercises: { type: Array, default: () => [] },
  usedIds: { type: Set, default: () => new Set() }
})
defineEmits(['select', 'close'])

// 按肌群分组（固定顺序：肩/胸/三头/背/二头/腿/核心/热身）
const CATEGORY_ORDER = ['shoulder', 'chest', 'triceps', 'back', 'biceps', 'legs', 'core', 'warmup']

const grouped = computed(() =>
  CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: MUSCLE_GROUP_LABELS[cat] || cat,
      items: props.exercises.filter(e => e.category === cat)
    }))
    .filter(g => g.items.length)
)
</script>

<style scoped>
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 6, 10, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 910;
}
.picker-sheet {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px 20px calc(24px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--border-strong);
}
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
.picker-title {
  font-size: 18px;
  font-weight: 700;
}
.picker-sub {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.picker-close {
  background: var(--surface-hover);
  border: none;
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.picker-group {
  margin-bottom: 16px;
}
.picker-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 6px 2px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.picker-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px 12px;
  min-height: 46px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s var(--easing);
  text-align: left;
}
.picker-item:active:not(:disabled) {
  border-color: var(--accent);
}
.picker-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.picker-name {
  flex: 1;
  min-width: 0;
}
.picker-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}
.picker-type.m {
  background: var(--success-dim);
  color: var(--success);
}
.picker-type.f {
  background: var(--accent-dim);
  color: var(--accent-strong);
}
.picker-used {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
</style>

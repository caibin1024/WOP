<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div class="sheet cycle-sheet">
      <div class="sheet-header">
        <div>
          <div class="sheet-title">编辑训练周期</div>
          <div class="sheet-sub">推 / 拉 / 腿 / 休 可重复，长 2-14 天</div>
        </div>
        <button class="sheet-close" aria-label="关闭" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="sheet-body cycle-body">
        <!-- 布局预览：按编辑中的槽位实时渲染 -->
        <div class="cycle-preview">
          <template v-for="(t, i) in slots" :key="i">
            <span v-if="i > 0" class="cycle-arrow">→</span>
            <span class="cycle-chip" :class="t">{{ SHORT_LABELS[t] || t }}</span>
          </template>
        </div>
        <p class="cycle-stats">{{ slots.length }} 天周期（{{ trainCount }} 练 {{ slots.length - trainCount }} 休）</p>

        <div class="slot-list">
          <div v-for="(t, i) in slots" :key="i" class="slot-row">
            <span class="slot-num num">{{ i + 1 }}</span>
            <select v-model="slots[i]" class="input slot-select">
              <option v-for="opt in TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
            <div class="slot-ops">
              <button class="icon-btn" :disabled="i === 0" aria-label="上移" @click="move(i, -1)">
                <AppIcon name="chevron-up" :size="16" />
              </button>
              <button class="icon-btn" :disabled="i === slots.length - 1" aria-label="下移" @click="move(i, 1)">
                <AppIcon name="chevron-down" :size="16" />
              </button>
              <button class="icon-btn danger" :disabled="slots.length <= 2" aria-label="删除该天" @click="removeSlot(i)">
                <AppIcon name="trash" :size="16" />
              </button>
            </div>
          </div>
        </div>

        <button class="add-slot" :disabled="slots.length >= 14" @click="slots.push('rest')">＋ 添加一天</button>

        <p v-if="previewLabel" class="cycle-preview-today">保存后今天将变为「{{ previewLabel }}」</p>
        <p v-if="cycleError" class="form-err">{{ cycleError }}</p>
        <p class="field-hint">保存会清空顺延记录（今日页与日历按新周期重算，训练记录不受影响）。</p>
      </div>

      <div class="sheet-actions">
        <button class="btn sheet-cancel" :disabled="saving" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="saving || !!cycleError" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 面板纳入返回键（返回键先关面板，不退出页面） -->
    <BackLayer :show="true" @back="emit('close')" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '../stores/training'
import { CYCLE_DAY_TYPES, isValidScheduleCycle } from '../database/seed'
import AppIcon from './AppIcon.vue'
import BackLayer from './BackLayer.vue'

/**
 * 训练周期编辑面板（v1.3.0）。
 * 保存语义 = setScheduleCycle：清空顺延时间线与撤销栈，confirm 里必须把后果讲清楚
 * （含"今天将变为 X"的实时预览），避免用户改完才发现排期被重置。
 * 与当前周期完全相同时直接关面板——否则一次"无变化保存"也会白白清掉顺延记录。
 */
const emit = defineEmits(['close'])

const training = useTrainingStore()

const SHORT_LABELS = { push: 'Push', pull: 'Pull', legs: 'Legs', rest: 'Rest' }
const TYPE_OPTIONS = [
  { value: 'push', label: 'Push 推日' },
  { value: 'pull', label: 'Pull 拉日' },
  { value: 'legs', label: 'Legs 腿核日' },
  { value: 'rest', label: 'Rest 休息日' }
]
const TODAY_LABELS = { push: 'Push 推日', pull: 'Pull 拉日', legs: 'Legs 腿核日', rest: '休息日(有氧)' }

const slots = ref([...training.scheduleCycle])
const saving = ref(false)

const trainCount = computed(() => slots.value.filter(t => t !== 'rest').length)

// 行内报错只为给出精确提示，权威判定仍是 isValidScheduleCycle（store 保存前再拦一道）
const cycleError = computed(() => {
  const a = slots.value
  if (a.length < 2) return '周期至少 2 天'
  if (a.length > 14) return '周期最多 14 天'
  if (a.some(t => !CYCLE_DAY_TYPES.includes(t))) return '存在未知日型'
  if (isValidScheduleCycle(a)) return ''
  if (!a.includes('rest')) return '周期至少要有 1 个休息日（顺延需要锁休）'
  return '周期至少要有 1 个训练日'
})

// 实时预览保存后的今日日型；周期非法时 previewTodayDayType 返回 null（报错行已提示）
const previewLabel = computed(() => {
  if (cycleError.value) return ''
  return TODAY_LABELS[training.previewTodayDayType(slots.value)] || ''
})

function move(i, delta) {
  const j = i + delta
  if (j < 0 || j >= slots.value.length) return
  const a = slots.value
  ;[a[i], a[j]] = [a[j], a[i]]
}

function removeSlot(i) {
  if (slots.value.length <= 2) return
  slots.value.splice(i, 1)
}

async function save() {
  if (cycleError.value) return
  // 无变化直接关：setScheduleCycle 会清顺延，不值得为相同配置付出重置代价
  if (JSON.stringify(slots.value) === JSON.stringify(training.scheduleCycle)) {
    emit('close')
    return
  }
  const ok = confirm(
    '保存新周期将：\n' +
    '1. 清空顺延时间线与撤销记录\n' +
    '2. 过去未训练的日期按新周期重算日型（训练记录不受影响）\n\n' +
    `保存后今天将变为「${previewLabel.value}」。确定保存吗？`
  )
  if (!ok) return
  saving.value = true
  try {
    await training.setScheduleCycle(slots.value)
    emit('close')
  } catch (e) {
    alert('保存失败：' + (e?.message || e))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* sheet 骨架与 ExerciseFormSheet 同源（.sheet-* 是 CalendarCard 的局部样式，用的地方都得自带一份） */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 910;
}
.sheet {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  padding: 20px 20px calc(24px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--border-strong);
}
.sheet-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.sheet-title {
  font-size: 18px;
  font-weight: 700;
}
.sheet-sub {
  font-size: 13px;
  color: var(--accent);
  margin-top: 2px;
}
.sheet-close {
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
}
.cycle-sheet {
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}
.cycle-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 布局预览条：复用设置页 .cycle-day 视觉语言 */
.cycle-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}
.cycle-chip {
  background: var(--surface-hover);
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
}
.cycle-chip.rest {
  color: var(--text-tertiary);
}
.cycle-stats {
  margin: 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.slot-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slot-num {
  width: 20px;
  text-align: right;
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}
.input:focus {
  outline: none;
  border-color: var(--accent);
}
.slot-select {
  flex: 1;
  min-width: 0;
}
.slot-ops {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.icon-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.icon-btn.danger {
  color: var(--danger, #ef4444);
}

.add-slot {
  background: var(--surface);
  border: 1px dashed var(--border-strong);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 10px 0;
  font-size: 13px;
  cursor: pointer;
}
.add-slot:disabled {
  opacity: 0.4;
  cursor: default;
}

.cycle-preview-today {
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: var(--accent-strong, var(--accent));
  font-weight: 600;
}
.form-err {
  margin: 0;
  font-size: 13px;
  color: var(--danger, #ef4444);
}
.field-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}

.sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}
.sheet-actions .btn {
  flex: 1;
}
.sheet-cancel {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
}
</style>

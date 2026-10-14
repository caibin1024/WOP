<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div class="sheet form-sheet">
      <div class="sheet-header">
        <div>
          <div class="sheet-title">{{ exercise ? '编辑动作' : '新增动作' }}</div>
          <div class="sheet-sub">{{ exercise ? '修改自定义动作内容' : '录入自己的动作教学' }}</div>
        </div>
        <button class="sheet-close" aria-label="关闭" @click="emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="sheet-body form-body">
        <label class="field">
          <span class="field-label">名称 <i class="req">*</i></span>
          <input v-model="form.name" class="input" maxlength="30" placeholder="如：杠铃卧推">
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">分类</span>
            <select v-model="form.category" class="input">
              <option v-for="(label, key) in MUSCLE_GROUP_LABELS" :key="key" :value="key">{{ label }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">类型</span>
            <div class="seg">
              <button type="button" :class="{ active: !form.isMachine }" @click="form.isMachine = false">自由</button>
              <button type="button" :class="{ active: form.isMachine }" @click="form.isMachine = true">器械</button>
            </div>
          </label>
        </div>

        <label class="field">
          <span class="field-label">目标肌群</span>
          <input v-model="form.targetMuscle" class="input" maxlength="50" placeholder="如：胸大肌、三头">
        </label>

        <label class="field">
          <span class="field-label">动作步骤 <i class="req">*</i></span>
          <textarea v-model="form.instructions" class="input textarea" rows="5"
            placeholder="每行一步，如：&#10;1. 坐姿，背靠椅背&#10;2. 呼气向上推起"></textarea>
        </label>

        <label class="field">
          <span class="field-label">常见错误</span>
          <textarea v-model="form.commonMistakes" class="input textarea" rows="3" placeholder="选填"></textarea>
        </label>

        <label class="field">
          <span class="field-label">小贴士</span>
          <textarea v-model="form.tips" class="input textarea" rows="2" placeholder="选填"></textarea>
        </label>

        <div class="field-row">
          <label class="field">
            <span class="field-label">建议重量(kg)</span>
            <input v-model.number="form.recommendedWeightKg" class="input" type="number" min="0" step="0.5"
              placeholder="选填" :disabled="isTimed">
          </label>
          <label class="field">
            <span class="field-label">计时(秒)</span>
            <input v-model.number="form.recommendedSeconds" class="input" type="number" min="0" step="1"
              placeholder=">0 = 计时动作">
          </label>
        </div>
        <p class="field-hint">填了「计时(秒)」即为计时动作（如平板支撑），记录按秒计、不带重量。</p>

        <p v-if="err" class="form-err">{{ err }}</p>
      </div>

      <div class="sheet-actions">
        <button class="btn sheet-cancel" :disabled="saving" @click="emit('close')">取消</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- 面板纳入返回键（返回键先关面板，不退出页面） -->
    <BackLayer :show="true" @back="emit('close')" />
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useTrainingStore } from '../stores/training'
import { MUSCLE_GROUP_LABELS } from '../models'
import AppIcon from './AppIcon.vue'
import BackLayer from './BackLayer.vue'

/**
 * 自定义动作录入/编辑面板。
 * 新增与编辑共用一个表单（exercise 传 null = 新增）；直接调 store 的 CRUD，
 * 校验失败（含"内置不可编辑/计时锁定"）以行内错误展示，不关面板。
 */
const props = defineProps({
  exercise: { type: Object, default: null }
})
const emit = defineEmits(['close', 'saved'])

const training = useTrainingStore()

const form = reactive({
  name: props.exercise?.name || '',
  category: props.exercise?.category || 'chest',
  isMachine: !!props.exercise?.isMachine,
  targetMuscle: props.exercise?.targetMuscle || '',
  instructions: props.exercise?.instructions || '',
  commonMistakes: props.exercise?.commonMistakes || '',
  tips: props.exercise?.tips || '',
  recommendedWeightKg: props.exercise?.recommendedWeightKg ?? '',
  recommendedSeconds: props.exercise?.recommendedSeconds ?? ''
})

const isTimed = computed(() => Number(form.recommendedSeconds) > 0)
const saving = ref(false)
const err = ref('')

async function save() {
  err.value = ''
  if (!form.name.trim()) {
    err.value = '请填写动作名称'
    return
  }
  if (!form.instructions.trim()) {
    err.value = '请填写动作步骤'
    return
  }
  saving.value = true
  try {
    if (props.exercise) {
      await training.updateCustomExercise(props.exercise.id, form)
    } else {
      await training.createCustomExercise(form)
    }
    emit('saved')
  } catch (e) {
    err.value = e?.message || '保存失败，请重试'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* sheet 骨架照抄 CalendarCard 的底部面板范式（.sheet-* 是它的局部样式，这里需要自带一份） */
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
.form-sheet {
  max-height: 88vh;
  display: flex;
  flex-direction: column;
}
.form-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-row {
  display: flex;
  gap: 12px;
}
.field-row .field {
  flex: 1;
  min-width: 0;
}
.field-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.req {
  color: var(--danger, #ef4444);
  font-style: normal;
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
.input:disabled {
  opacity: 0.5;
}
.textarea {
  resize: vertical;
  line-height: 1.6;
}
.seg {
  display: flex;
  gap: 6px;
}
.seg button {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 10px 0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.seg button.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
  font-weight: 600;
}
.field-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}
.form-err {
  margin: 0;
  font-size: 13px;
  color: var(--danger, #ef4444);
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

<template>
  <div class="wizard-root">
    <!-- 头部：步骤指示器 + 标题 -->
    <div class="wizard-header">
      <div class="wizard-steps">
        <template v-for="i in 3" :key="i">
          <span class="step-dot" :class="{ current: step === i, done: step > i }">
            <AppIcon v-if="step > i" name="check" :size="12" />
            <template v-else>{{ i }}</template>
          </span>
          <span v-if="i < 3" class="step-line" :class="{ done: step > i }"></span>
        </template>
      </div>
      <div class="wizard-kicker">第 {{ step }}/3 步 · {{ stepNames[step - 1] }}</div>
      <h2 class="wizard-title">{{ stepTitles[step - 1] }}</h2>
    </div>

    <!-- 正文 -->
    <div class="wizard-body">
      <div v-if="!ready" class="wizard-loading">加载中…</div>

      <!-- 步骤① 个人资料 -->
      <div v-else-if="step === 1" class="step-panel">
        <div class="form-row">
          <span>身高</span>
          <div class="form-field">
            <input type="number" inputmode="decimal" class="form-input" v-model.number="form.heightCm" min="100" max="250">
            <span class="form-unit">cm</span>
          </div>
        </div>
        <div class="form-row">
          <span>年龄</span>
          <div class="form-field">
            <input type="number" inputmode="numeric" class="form-input" v-model.number="form.age" min="1" max="120">
            <span class="form-unit">岁</span>
          </div>
        </div>
        <div class="form-row">
          <span>性别</span>
          <select class="form-input" v-model="form.gender">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
        </div>
        <div class="form-row">
          <span>目标</span>
          <input type="text" class="form-input form-input-flex" v-model="form.goal" placeholder="如：综合增肌减脂">
        </div>
        <div class="form-row">
          <span>优先级</span>
          <input type="text" class="form-input form-input-flex" v-model="form.priority" placeholder="如：肩 > 胸 > 背 > 腹">
        </div>
        <div class="form-row">
          <span>体重</span>
          <div class="form-field">
            <input type="number" inputmode="decimal" class="form-input" v-model.number="form.weightKg" :placeholder="weightPlaceholder">
            <span class="form-unit">kg</span>
          </div>
        </div>
        <p v-if="step1Error" class="form-err">{{ step1Error }}</p>
        <p class="field-hint">这些数据用于 BMI 计算与 AI 教练的个性化建议，全部只存本机。点「下一步」才保存。</p>
      </div>

      <!-- 步骤② 训练周期 -->
      <div v-else-if="step === 2" class="step-panel">
        <button v-for="(p, i) in PRESETS" :key="p.key" class="preset-card"
                :class="{ selected: selectedPreset === i }" @click="selectedPreset = i">
          <div class="preset-head">
            <span class="preset-title">{{ p.title }}</span>
            <AppIcon v-if="selectedPreset === i" name="check" :size="16" class="preset-check" />
          </div>
          <div class="cycle-chips">
            <template v-for="(t, j) in p.cycle" :key="j">
              <span v-if="j > 0" class="cycle-arrow">→</span>
              <span class="cycle-chip" :class="t">{{ CYCLE_SHORT[t] }}</span>
            </template>
          </div>
          <div class="preset-desc">{{ p.desc }}</div>
        </button>

        <!-- 自定义：选中态 = 未命中任何预设（当前周期是自己排的） -->
        <button class="preset-card" :class="{ selected: selectedPreset === null }" @click="openCustom">
          <div class="preset-head">
            <span class="preset-title">自定义…</span>
            <AppIcon v-if="selectedPreset === null" name="check" :size="16" class="preset-check" />
          </div>
          <div class="cycle-chips">
            <template v-for="(t, j) in previewCycle" :key="j">
              <span v-if="j > 0" class="cycle-arrow">→</span>
              <span class="cycle-chip" :class="t">{{ CYCLE_SHORT[t] || t }}</span>
            </template>
          </div>
          <div class="preset-desc">2-14 天自由排，日型可重复（点开编辑器）</div>
        </button>

        <p v-if="previewLabel" class="cycle-preview-today">按此周期，今天将是「{{ previewLabel }}」</p>
        <p class="field-hint">周期决定每天该练什么，之后可在设置页随时修改（改周期会重置顺延记录）。</p>
      </div>

      <!-- 步骤③ 计划动作 -->
      <div v-else class="step-panel">
        <div class="day-seg">
          <button v-for="t in DAY_TABS" :key="t.key" class="day-seg-btn"
                  :class="{ current: dayTab === t.key }" @click="dayTab = t.key">
            {{ t.label }}
          </button>
        </div>
        <p v-if="missingDayHint" class="field-hint">{{ missingDayHint }}</p>

        <div class="slot-list">
          <div v-for="slot in daySlots" :key="slot.id" class="slot-row">
            <div class="slot-name-group">
              <span class="slot-name">{{ slot.exercise.name }}</span>
              <span class="tag">{{ slot.exercise.isMachine ? '器械' : '自由' }}</span>
              <span v-if="slot.exercise.category === 'warmup'" class="badge badge-orange">热身</span>
            </div>
            <button class="slot-remove" aria-label="移除" @click="removeSlot(slot)">
              <AppIcon name="trash" :size="15" />
            </button>
          </div>
          <div v-if="!daySlots.length" class="slot-empty">这一天还没有动作</div>
        </div>

        <button class="add-btn" @click="pickerOpen = true">
          <AppIcon name="plus" :size="14" /><span>添加动作</span>
        </button>
        <p class="field-hint">组数 / 次数 / 重量可在设置页的「训练计划」里细调。</p>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="wizard-actions">
      <button v-if="step > 1" class="btn wizard-side" :disabled="busy" @click="step--">上一步</button>
      <span v-else class="wizard-side-placeholder"></span>
      <button class="btn wizard-skip" :disabled="busy" @click="skipOrFinish">
        {{ mode === 'reenter' ? '关闭' : '跳过引导' }}
      </button>
      <button class="btn btn-primary wizard-next" :disabled="busy || !ready" @click="next">
        {{ busy ? '保存中…' : (step < 3 ? '下一步' : '完成') }}
      </button>
    </div>
    <p v-if="mode === 'firstRun'" class="wizard-foot-hint">跳过后不再自动显示，可随时在设置页重新引导</p>

    <!-- 自定义周期编辑面板（自带 BackLayer + overlay，零改动复用） -->
    <CycleEditorSheet v-if="cycleEditorOpen" @close="onCycleEditorClose" />

    <!-- 添加动作面板（自身不带 BackLayer，返回键接管在本组件） -->
    <ExercisePickerSheet
      v-if="pickerOpen"
      title="添加动作"
      :day-label="currentDayLabel"
      :exercises="training.allExercises"
      :used-ids="tabUsedIds"
      @select="onAddSelect"
      @close="pickerOpen = false"
    />
    <BackLayer :show="pickerOpen" @back="pickerOpen = false" />

    <!-- 重进模式：返回键先关向导（内部浮层的 BackLayer 压在其上，closeTop 先关浮层）。
         首启模式不挂：按返回走「再按一次退出」，引导不能被返回键绕过 -->
    <BackLayer v-if="mode === 'reenter'" :show="true" @back="skipOrFinish" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useTrainingStore } from '../stores/training'
import { useProfileStore } from '../stores/profile'
import { useBodyStore } from '../stores/body'
import { run, todayStr } from '../database'
import AppIcon from './AppIcon.vue'
import BackLayer from './BackLayer.vue'
import CycleEditorSheet from './CycleEditorSheet.vue'
import ExercisePickerSheet from './ExercisePickerSheet.vue'

/**
 * 首次启动配置引导（v1.4.0）：填资料 → 选周期 → 配计划动作，三步可整体跳过。
 * 写库语义：只有「下一步」落库（跳过/关闭丢当前步草稿）；步骤③增删即时落库（复用 store API）。
 * 完成与跳过同一收尾：写 app_meta.onboarded='1'——语义是"已引导、不再自动弹"，与配置完成度无关。
 * mode='firstRun' 由 App.vue 启动状态机挂载；mode='reenter' 由设置页自挂（预填当前值）。
 */
const props = defineProps({
  mode: { type: String, default: 'firstRun' } // 'firstRun' | 'reenter'
})
const emit = defineEmits(['finish'])

const training = useTrainingStore()
const profile = useProfileStore()
const body = useBodyStore()

const step = ref(1)
const ready = ref(false) // training.init + profile/body load 完成前不渲染步骤体
const busy = ref(false)

const stepNames = ['个人资料', '训练周期', '计划动作']
const stepTitles = ['先认识一下你', '怎么安排训练节奏？', '每天练什么？']

// 步骤①草稿：不直接绑 store——「跳过」必须能丢弃未确认的输入
const form = reactive({ heightCm: 172, age: 28, gender: 'male', goal: '', priority: '', weightKg: '' })
const step1Error = ref('')

// 体重可留空：留空零副作用（不写 body_records），填了才落今天一条
const weightPlaceholder = computed(() =>
  body.latest ? `当前记录 ${body.latest.weightKg} kg，留空不改` : '可留空，之后在身体页记录'
)

function validateStep1() {
  const h = Number(form.heightCm)
  if (!(h >= 100 && h <= 250)) { step1Error.value = '身高需在 100-250 cm 之间'; return false }
  const a = Number(form.age)
  if (!(a >= 1 && a <= 120)) { step1Error.value = '年龄需在 1-120 之间'; return false }
  if (String(form.weightKg).trim() !== '') {
    const w = Number(form.weightKg)
    if (!(w >= 20 && w <= 300)) { step1Error.value = '体重需在 20-300 kg 之间'; return false }
  }
  step1Error.value = ''
  return true
}

async function nextFromStep1() {
  if (!validateStep1()) return
  busy.value = true
  try {
    profile.heightCm = Number(form.heightCm)
    profile.age = Number(form.age)
    profile.gender = form.gender
    profile.goal = form.goal
    profile.priority = form.priority
    await profile.save()
    if (String(form.weightKg).trim() !== '') {
      await body.saveRecord({ date: todayStr(), weightKg: Number(form.weightKg) })
    }
    step.value = 2
  } catch (e) {
    step1Error.value = '保存失败：' + (e?.message || e)
  } finally {
    busy.value = false
  }
}

// 步骤②：预设卡 + 自定义（复用 CycleEditorSheet，零改动）。
// 不放「练二休一」：3 槽排 2 练必然丢一个日型，当预设卡会误导
const PRESETS = [
  { key: 'p3r1', title: '练三休一（默认）', desc: '推 → 拉 → 腿 → 休，经典 PPL 节奏', cycle: ['push', 'pull', 'legs', 'rest'] },
  { key: 'p1r1', title: '练一休一', desc: '每次训练后休一天，恢复更充分（6 天轮完 PPL）', cycle: ['push', 'rest', 'pull', 'rest', 'legs', 'rest'] },
  { key: 'p3r2', title: '练三休二', desc: '练三天连休两天，恢复优先', cycle: ['push', 'pull', 'legs', 'rest', 'rest'] }
]
const CYCLE_SHORT = { push: 'Push', pull: 'Pull', legs: 'Legs', rest: 'Rest' }
const TODAY_LABELS = { push: 'Push 推日', pull: 'Pull 拉日', legs: 'Legs 腿核日', rest: '休息日(有氧)' }

// null = 自定义（当前周期未命中任何预设）
const selectedPreset = ref(null)

// findIndex 未命中返回 -1，必须归一成 null——"自定义"的哨兵是 null：
// -1 会被 `!= null` 误判成"选中了预设"，PRESETS[-1] 取 undefined 会让渲染直接崩掉
// （面板停在"保存中…"的旧 DOM 上，看起来像保存卡死，其实库已写成功）
function presetIndexOf(cycle) {
  const i = PRESETS.findIndex(p => JSON.stringify(p.cycle) === JSON.stringify(cycle))
  return i >= 0 ? i : null
}

const previewCycle = computed(() =>
  selectedPreset.value != null ? PRESETS[selectedPreset.value].cycle : [...training.scheduleCycle]
)
const previewLabel = computed(() => TODAY_LABELS[training.previewTodayDayType(previewCycle.value)] || '')

const cycleEditorOpen = ref(false)
let cycleBeforeEdit = null
function openCustom() {
  cycleBeforeEdit = JSON.stringify(training.scheduleCycle)
  cycleEditorOpen.value = true
}
// CycleEditorSheet 只 emit('close')，分不清保存/取消——用"库里周期变没变"来区分：
// 真保存了才重匹配选中态（保存结果可能恰好命中某预设）；取消则保留向导内未落库的选择
function onCycleEditorClose() {
  cycleEditorOpen.value = false
  if (JSON.stringify(training.scheduleCycle) !== cycleBeforeEdit) {
    selectedPreset.value = presetIndexOf(training.scheduleCycle)
  }
}

async function nextFromStep2() {
  const next = previewCycle.value
  const changed = JSON.stringify(next) !== JSON.stringify(training.scheduleCycle)
  if (changed) {
    // 有顺延历史才确认（改周期=清顺延是既有破坏性语义）；首启时间线为空，
    // 静默保存——弹"顺延"黑话只会吓到新用户
    if (training.scheduleChanges.length) {
      const ok = confirm(
        '保存新周期将清空顺延时间线与撤销记录，过去未训练的日期按新周期重算日型。\n' +
        `保存后今天将变为「${previewLabel.value}」。确定吗？`
      )
      if (!ok) return
    }
    busy.value = true
    try {
      await training.setScheduleCycle(next)
    } catch (e) {
      alert('保存失败：' + (e?.message || e))
      return
    } finally {
      busy.value = false
    }
  }
  step.value = 3
}

// 步骤③：三日 tab（日型与周期槽位解耦——周期里没排到的日期，计划配了也不生效）
const DAY_TABS = [
  { key: 'push', label: 'Push 推日' },
  { key: 'pull', label: 'Pull 拉日' },
  { key: 'legs', label: 'Legs 腿核日' }
]
const dayTab = ref('push')
const currentDayLabel = computed(() => DAY_TABS.find(t => t.key === dayTab.value)?.label || '')
const daySlots = computed(() => training.planByDay[dayTab.value] || [])
const tabUsedIds = computed(() => new Set(daySlots.value.map(s => s.exerciseId)))
// 周期用已落库的 scheduleCycle（走到步骤③时步骤②已「下一步」）
const missingDayHint = computed(() =>
  training.scheduleCycle.includes(dayTab.value)
    ? ''
    : `当前周期不含 ${currentDayLabel.value}，此处配置仅在排到该日时生效`
)

const pickerOpen = ref(false)

async function onAddSelect(exId) {
  pickerOpen.value = false
  try {
    await training.addPlanExercise(dayTab.value, exId)
  } catch (e) {
    alert('添加失败：' + (e?.message || e))
  }
}

async function removeSlot(slot) {
  if (!confirm(`从「${currentDayLabel.value}」中移除「${slot.exercise.name}」？`)) return
  try {
    await training.removePlanExercise(dayTab.value, slot.id)
  } catch (e) {
    alert('移除失败：' + (e?.message || e))
  }
}

/** 完成与跳过同写 onboarded='1'：语义是"已引导，不再自动弹"，与配置完成度无关 */
async function markOnboarded() {
  await run(
    "INSERT INTO app_meta (key, value) VALUES ('onboarded', '1') ON CONFLICT(key) DO UPDATE SET value = '1'",
    []
  )
}

async function skipOrFinish() {
  if (busy.value) return
  busy.value = true
  try {
    await markOnboarded()
    emit('finish')
  } catch (e) {
    // 写标记失败也放行：卡在向导里比"下次可能再弹一次"更糟
    console.error('写引导标记失败', e)
    emit('finish')
  } finally {
    busy.value = false
  }
}

async function next() {
  if (step.value === 1) return nextFromStep1()
  if (step.value === 2) return nextFromStep2()
  await skipOrFinish() // 步骤③的「完成」
}

onMounted(async () => {
  // init() 幂等（initPromise 缓存）：引导先行 init 后，TodayView 首挂载复用同一 Promise，无双初始化
  await training.init()
  await Promise.all([profile.load(), body.load()])
  // 预填当前值（首启 = 默认值；重进 = 库里的现值）
  form.heightCm = profile.heightCm
  form.age = profile.age
  form.gender = profile.gender
  form.goal = profile.goal
  form.priority = profile.priority
  form.weightKg = '' // 体重不预填，防误覆盖今天已有记录；placeholder 显示当前值
  selectedPreset.value = presetIndexOf(training.scheduleCycle)
  ready.value = true
})
</script>

<style scoped>
/* 全屏引导层：低于浮层(910)、高于底部导航(100)；自带背景不透底。
   背景必须对齐 body（--bg-base + 同款渐变）——曾误写不存在的 var(--bg)，
   变量解析失败=全透明：首启底下是 body 看不出来，重进模式直接透穿设置页 */
.wizard-root {
  position: fixed;
  inset: 0;
  z-index: 500;
  background-color: var(--bg-base);
  background-image: radial-gradient(ellipse 80% 50% at 50% -20%, var(--bg-glow), transparent),
    linear-gradient(180deg, var(--bg-base), var(--bg-deep));
  display: flex;
  flex-direction: column;
  padding: calc(var(--sp-4) + var(--safe-top-real, env(safe-area-inset-top))) 20px
           calc(12px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  box-sizing: border-box;
}

/* 步骤指示器：纯 CSS 圆点 + 连接线 */
.wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.step-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-tertiary);
}
.step-dot.current {
  background: var(--accent);
  border-color: transparent;
  color: var(--on-accent);
}
.step-dot.done {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}
.step-line {
  width: 28px;
  height: 2px;
  background: var(--border);
  border-radius: 1px;
}
.step-line.done {
  background: var(--accent);
}

.wizard-kicker {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}
.wizard-title {
  margin: 6px 0 0;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
}

.wizard-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: 18px;
}
.wizard-loading {
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
  padding: 40px 0;
}
.step-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 表单行：与设置页 profile-row 同视觉（scoped 自带） */
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}
.form-row > span:first-child {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.form-field {
  display: flex;
  align-items: center;
  gap: 6px;
}
.form-input {
  height: 36px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  padding: 0 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s var(--easing);
}
.form-field .form-input {
  width: 92px;
  text-align: right;
}
.form-input-flex {
  flex: 1;
  min-width: 0;
  text-align: left;
}
.form-input:focus {
  border-color: var(--accent);
}
.form-unit {
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
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

/* 周期预设卡 */
.preset-card {
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  cursor: pointer;
  transition: border-color 0.2s var(--easing);
}
.preset-card.selected {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.preset-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.preset-title {
  font-size: 15px;
  font-weight: 600;
}
.preset-check {
  color: var(--accent-strong);
  flex-shrink: 0;
}
.preset-desc {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.cycle-chips {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.cycle-arrow {
  color: var(--text-tertiary);
  font-size: 11px;
}
.cycle-chip {
  background: var(--surface-hover);
  padding: 4px 9px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  border: 1px solid var(--border);
}
.cycle-chip.rest {
  color: var(--text-tertiary);
}
.cycle-preview-today {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-strong, var(--accent));
}

/* 步骤③：日型分段 + 动作行 */
.day-seg {
  display: flex;
  gap: 8px;
}
.day-seg-btn {
  flex: 1;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.day-seg-btn.current {
  background: var(--accent);
  color: var(--on-accent);
  border-color: transparent;
  box-shadow: 0 4px 16px var(--accent-glow);
}
.slot-list {
  display: flex;
  flex-direction: column;
}
.slot-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border);
}
.slot-name-group {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.slot-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.slot-remove {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 0.2s var(--easing);
}
.slot-remove:hover {
  color: var(--danger);
  border-color: var(--danger);
}
.slot-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary);
}
.add-btn {
  width: 100%;
  min-height: 44px;
  background: transparent;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.add-btn:active {
  color: var(--accent);
  border-color: var(--accent);
}

/* 底部操作：上一步 / 跳过 / 下一步·完成 */
.wizard-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}
.wizard-side {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  flex-shrink: 0;
}
.wizard-side-placeholder {
  flex-shrink: 0;
  width: 72px;
}
.wizard-skip {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  font-size: 13px;
}
.wizard-next {
  flex: 1.4;
}
.wizard-foot-hint {
  margin: 8px 0 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
}
</style>

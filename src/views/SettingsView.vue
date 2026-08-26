<template>
  <div class="settings-view">
    <div class="page-header settings-header">
      <button class="back-btn" @click="goBack" aria-label="返回">
        <AppIcon class="back-icon" name="arrow-right" :size="20" />
      </button>
      <div>
        <h1>设置</h1>
        <div class="subtitle">训练计划 · 数据管理</div>
      </div>
    </div>

    <div class="page-padding settings-list">
      <!-- 外观：主题切换 -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('appearance')" aria-expanded="openGroups.appearance">
          <AppIcon name="theme" :size="20" class="row-icon" />
          <div class="row-text">
            <span class="row-title">外观</span>
            <span class="row-sub">{{ themeSub }}</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.appearance }" />
        </button>
        <div v-show="openGroups.appearance" class="setting-body">
          <div class="theme-seg" role="radiogroup" aria-label="主题">
            <button
              v-for="opt in THEME_OPTIONS"
              :key="opt.value"
              class="theme-seg-btn"
              :class="{ current: theme.mode === opt.value }"
              :aria-pressed="theme.mode === opt.value"
              @click="theme.setMode(opt.value)"
            >{{ opt.label }}</button>
          </div>
          <p class="settings-note">「跟随系统」会自动匹配手机的深色 / 浅色设置。</p>
        </div>
      </div>

      <!-- 训练计划（训练节奏 + 计划动作配置） -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('plan')" aria-expanded="openGroups.plan">
          <AppIcon name="dumbbell" :size="20" class="row-icon" />
          <div class="row-text">
            <span class="row-title">训练计划</span>
            <span class="row-sub">PPL 练3休1 · 今天{{ todayLabel }}</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.plan }" />
        </button>
        <div v-show="openGroups.plan" class="setting-body">
          <div class="plan-cycle">
            <div class="cycle-row">
              <span class="cycle-day" :class="{ current: training.todayDayType === 'push' }">Push</span>
              <span class="cycle-arrow">→</span>
              <span class="cycle-day" :class="{ current: training.todayDayType === 'pull' }">Pull</span>
              <span class="cycle-arrow">→</span>
              <span class="cycle-day" :class="{ current: training.todayDayType === 'legs' }">Legs</span>
              <span class="cycle-arrow">→</span>
              <span class="cycle-day" :class="{ current: training.todayDayType === 'rest' }">Rest</span>
            </div>
            <div class="cycle-note">练3天休1天循环 · 今天：{{ todayLabel }}</div>
          </div>
          <div class="plan-day-list">
            <template v-for="day in planDays" :key="day.dayType">
              <button class="plan-day-row" @click="toggleDay(day.dayType)">
                <div class="plan-day-row-text">
                  <span class="plan-day-row-label">{{ day.label }}</span>
                  <span class="plan-day-row-desc">{{ day.description }}</span>
                </div>
                <span class="plan-day-row-count num">{{ day.slots.length }} 个动作</span>
                <AppIcon name="chevron-down" :size="16" class="plan-day-chevron" :class="{ open: openDay === day.dayType }" />
              </button>
              <div v-show="openDay === day.dayType" class="plan-day-body">
                <div v-for="slot in day.slots" :key="slot.id" class="plan-slot">
                <div class="plan-slot-top">
                  <div class="plan-slot-name-group">
                    <span class="plan-slot-name"
                          @pointerdown="startPress(slot, $event)"
                          @pointermove="movePress($event)"
                          @pointerup="cancelPress"
                          @pointerleave="cancelPress"
                          @pointercancel="cancelPress"
                          @contextmenu.prevent>{{ slot.exercise.name }}</span>
                    <span class="tag">{{ slot.exercise.isMachine ? '器械' : '自由' }}</span>
                    <span v-if="slot.exercise.category === 'warmup'" class="badge badge-orange">热身</span>
                  </div>
                  <div class="plan-slot-right">
                    <span v-if="savedAt[slot.id]" class="plan-saved">✓ 已保存</span>
                    <button class="plan-icon-btn danger" @click="removeSlot(day.dayType, slot)" aria-label="删除">
                      <AppIcon name="trash" :size="15" />
                    </button>
                  </div>
                </div>

                <div class="plan-slot-fields">
                  <div class="plan-slot-field">
                    <span>组数</span>
                    <input type="number" inputmode="numeric" class="slot-input" min="1"
                           v-model.number="editFor(slot).targetSets"
                           @change="saveSlotField(day.dayType, slot, 'targetSets')">
                  </div>
                  <div v-if="!isTimed(slot)" class="plan-slot-field">
                    <span>次数</span>
                    <input type="number" inputmode="numeric" class="slot-input" min="1"
                           v-model.number="editFor(slot).reps"
                           @change="saveSlotField(day.dayType, slot, 'reps')">
                  </div>
                  <div v-if="isTimed(slot)" class="plan-slot-field">
                    <span>坚持(s)</span>
                    <input type="number" inputmode="numeric" class="slot-input" min="0"
                           :value="secondsValue(slot)"
                           @change="saveSeconds(slot, $event)">
                  </div>
                  <div v-else-if="isWeighted(slot)" class="plan-slot-field">
                    <span>重量(kg)</span>
                    <input type="number" inputmode="decimal" class="slot-input" min="0"
                           :value="weightValue(slot)"
                           @change="saveWeight(slot, $event)">
                  </div>
                  <div class="plan-slot-move">
                    <button class="plan-icon-btn" :disabled="isFirst(day.slots, slot)"
                            @click="training.movePlanExercise(day.dayType, slot.id, -1)" aria-label="上移">
                      <AppIcon name="chevron-up" :size="16" />
                    </button>
                    <button class="plan-icon-btn" :disabled="isLast(day.slots, slot)"
                            @click="training.movePlanExercise(day.dayType, slot.id, 1)" aria-label="下移">
                      <AppIcon name="chevron-down" :size="16" />
                    </button>
                  </div>
                </div>

              </div>

                <button class="plan-add-btn" @click="openPicker('add', day.dayType, null)">
                  <AppIcon name="plus" :size="16" /> 添加动作
                </button>
              </div>
            </template>
          </div>
          <p class="settings-note">
            长按动作名可替换动作；可添加 / 删除 / 排序动作，并配置组数、次数、重量；改动实时生效，今日页下次进入生效。
          </p>
        </div>
      </div>

      <!-- AI 咨询 -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('ai')" aria-expanded="openGroups.ai">
          <AppIcon name="sparkles" :size="20" class="row-icon accent" />
          <div class="row-text">
            <span class="row-title">AI 咨询</span>
            <span class="row-sub">{{ ai.hasApiKey ? 'DeepSeek Key 已配置' : '未配置 API Key' }}</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.ai }" />
        </button>
        <div v-show="openGroups.ai" class="setting-body">
          <div class="ai-key-row">
            <input
              :type="showKey ? 'text' : 'password'"
              class="profile-input ai-key-input"
              :class="{ 'has-key': ai.hasApiKey }"
              v-model="keyInput"
              placeholder="sk-..."
              autocomplete="off"
            >
            <button class="plan-act-btn" @click="showKey = !showKey">
              {{ showKey ? '隐藏' : '显示' }}
            </button>
          </div>
          <div class="settings-actions">
            <button class="btn btn-primary" @click="saveKey" :disabled="savingKey">
              <AppIcon name="save" :size="16" />
              <span>{{ savingKey ? '保存中...' : '保存 Key' }}</span>
            </button>
            <button class="btn" @click="createNewSession" :disabled="!ai.hasApiKey || newSessionting">
              <AppIcon name="sparkles" :size="16" />
              <span>{{ newSessionting ? '新建中...' : '新建会话' }}</span>
            </button>
          </div>
          <div v-if="keyMsg" class="settings-tip" :class="{ error: keyMsg[0] === '❌' }">{{ keyMsg }}</div>
          <p class="settings-note">
            在 DeepSeek 开放平台（platform.deepseek.com）注册后创建 API Key，按 token 计费。
            Key 仅保存在本机，不随导出数据或安装包分发。
            点「新建会话」会清空旧会话，并把你的个人资料与训练节奏发送给 DeepSeek（消耗少量 token，顺带做连接测试）；
            此后每次咨询前，新增的训练 / 身体 / 有氧数据会自动增量上传，只发往 DeepSeek。
          </p>
        </div>
      </div>

      <!-- 数据管理 -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('data')" aria-expanded="openGroups.data">
          <AppIcon name="export" :size="20" class="row-icon" />
          <div class="row-text">
            <span class="row-title">数据管理</span>
            <span class="row-sub">导出训练记录 · 清空数据</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.data }" />
        </button>
        <div v-show="openGroups.data" class="setting-body">
          <div class="settings-actions">
            <button class="btn btn-primary" @click="doExport" :disabled="exporting">
              <AppIcon name="export" :size="18" />
              <span>{{ exporting ? '导出中...' : '导出全部数据(JSON)' }}</span>
            </button>
            <button class="btn btn-danger" @click="confirmClear">
              <AppIcon name="trash" :size="18" />
              <span>清空全部数据</span>
            </button>
          </div>
          <div class="settings-tip" v-if="exportResult">{{ exportResult }}</div>
          <p class="settings-note">
            导出 JSON 用于备份与迁移参考（包含你自定义的训练计划，不包含 AI Key）。
          </p>
        </div>
      </div>

      <!-- 个人资料：可编辑，导出数据读取真实值 -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('profile')" aria-expanded="openGroups.profile">
          <AppIcon name="pencil" :size="20" class="row-icon" />
          <div class="row-text">
            <span class="row-title">个人资料</span>
            <span class="row-sub">{{ profileSub }}</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.profile }" />
        </button>
        <div v-show="openGroups.profile" class="setting-body">
          <div class="profile-row">
            <span>身高</span>
            <div class="profile-field">
              <input type="number" inputmode="decimal" class="profile-input" v-model.number="profile.heightCm" min="100" max="250">
              <span class="profile-unit">cm</span>
            </div>
          </div>
          <div class="profile-row">
            <span>年龄</span>
            <div class="profile-field">
              <input type="number" inputmode="numeric" class="profile-input" v-model.number="profile.age" min="1" max="120">
              <span class="profile-unit">岁</span>
            </div>
          </div>
          <div class="profile-row">
            <span>性别</span>
            <select class="profile-input profile-select" v-model="profile.gender">
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          <div class="profile-row">
            <span>目标</span>
            <input type="text" class="profile-input profile-input-flex" v-model="profile.goal" placeholder="如：综合增肌减脂">
          </div>
          <div class="profile-row">
            <span>优先级</span>
            <input type="text" class="profile-input profile-input-flex" v-model="profile.priority" placeholder="如：肩 > 胸 > 背 > 腹">
          </div>
          <div class="profile-row">
            <span>当前体重</span>
            <span class="profile-static num">{{ body.latest ? body.latest.weightKg + ' kg' : '未记录（去身体页录入）' }}</span>
          </div>
          <button class="btn btn-primary profile-save" @click="doSaveProfile" :disabled="savingProfile">
            <span>{{ savingProfile ? '保存中...' : '保存资料' }}</span>
          </button>
          <div class="settings-tip" v-if="profileSaved">{{ profileSaved }}</div>
        </div>
      </div>

      <!-- 版本 -->
      <div class="setting-group">
        <button class="setting-row" @click="toggleGroup('about')" aria-expanded="openGroups.about">
          <AppIcon name="info" :size="20" class="row-icon" />
          <div class="row-text">
            <span class="row-title">版本</span>
            <span class="row-sub">WOP v{{ APP_VERSION }} · 离线可用</span>
          </div>
          <AppIcon name="chevron-down" :size="18" class="row-chevron" :class="{ open: openGroups.about }" />
        </button>
        <div v-show="openGroups.about" class="setting-body">
          <p class="settings-note">
            当前版本 WOP v{{ APP_VERSION }}。所有训练数据保存在本机，完全离线可用；
            AI 咨询需联网调用 DeepSeek 接口。
          </p>
        </div>
      </div>
    </div>

    <!-- 选动作底部面板（换 / 添加共用） -->
    <ExercisePickerSheet
      v-if="picker"
      :title="pickerTitle"
      :day-label="pickerDayLabel"
      :exercises="training.allExercises"
      :used-ids="usedIds"
      @select="onPickerSelect"
      @close="picker = null"
    />

    <!-- 选动作面板纳入返回键 -->
    <BackLayer :show="!!picker" @back="picker = null" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '../stores/training'
import { useProfileStore } from '../stores/profile'
import { useBodyStore } from '../stores/body'
import { useAiStore } from '../stores/ai'
import { useThemeStore } from '../stores/theme'
import { exportAllData } from '../services/exportData'
import { PLAN_LABELS } from '../database/seed'
import { initDatabase, run } from '../database'
import AppIcon from '../components/AppIcon.vue'
import ExercisePickerSheet from '../components/ExercisePickerSheet.vue'
import BackLayer from '../components/BackLayer.vue'
import { APP_VERSION } from '../version'

const router = useRouter()
const training = useTrainingStore()
const profile = useProfileStore()
const body = useBodyStore()
const ai = useAiStore()
const theme = useThemeStore()

// 外观：三档主题选项 + 分组副标题
const THEME_OPTIONS = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' }
]
const THEME_LABEL = { dark: '深色', light: '浅色', system: '跟随系统' }
const themeSub = computed(() => {
  const label = THEME_LABEL[theme.mode] || '跟随系统'
  if (theme.mode === 'system') return `${label} · 当前${theme.effective === 'dark' ? '深色' : '浅色'}`
  return label
})

const exporting = ref(false)
const exportResult = ref('')
const savingProfile = ref(false)
const profileSaved = ref('')

// 分组收折状态：默认全部收起，点击分组行展开/收起（各自独立开合）
const openGroups = reactive({ appearance: false, plan: false, ai: false, data: false, profile: false, about: false })
function toggleGroup(key) {
  openGroups[key] = !openGroups[key]
}

// 训练计划二级折叠：当前展开的训练日（互斥，一次只看一个日）
const openDay = ref('')
function toggleDay(dayType) {
  openDay.value = openDay.value === dayType ? '' : dayType
}

// 长按动作名替换动作（500ms，移动超阈值取消）
const pressTimer = ref(null)
const pressStart = ref(null)
function startPress(slot, e) {
  cancelPress()
  pressStart.value = { x: e.clientX, y: e.clientY }
  pressTimer.value = setTimeout(() => {
    pressTimer.value = null
    if (confirm(`长按替换「${slot.exercise.name}」？`)) {
      openPicker('swap', slot.dayType, slot)
    }
  }, 500)
}
function movePress(e) {
  if (pressTimer.value && pressStart.value) {
    const dx = e.clientX - pressStart.value.x
    const dy = e.clientY - pressStart.value.y
    if (dx * dx + dy * dy > 100) cancelPress() // 手指移动 >10px 视为滑动，取消长按
  }
}
function cancelPress() {
  if (pressTimer.value) {
    clearTimeout(pressTimer.value)
    pressTimer.value = null
  }
}

// 个人资料概览（分组副标题）
const profileSub = computed(() => {
  const parts = []
  if (profile.heightCm) parts.push(`${profile.heightCm}cm`)
  if (profile.age) parts.push(`${profile.age}岁`)
  if (parts.length) return parts.join(' · ')
  return '身高 / 年龄 / 目标'
})

const DAY_ORDER = ['push', 'pull', 'legs']

// 计划展示：由 workout_day_exercises 表（planByDay）驱动
const planDays = computed(() =>
  DAY_ORDER.map(dt => {
    const info = PLAN_LABELS[dt] || {}
    const slots = [...(training.planByDay[dt] || [])].sort((a, b) => a.sortOrder - b.sortOrder)
    return { dayType: dt, label: info.label || dt, description: info.description || '', slots }
  })
)

// 槽位级配置编辑态（组数/次数），懒创建
const edits = reactive({})
function editFor(slot) {
  if (!edits[slot.id]) {
    edits[slot.id] = {
      targetSets: slot.targetSets,
      reps: slot.targetRepsMin
    }
  }
  return edits[slot.id]
}

// 动作级默认（重量/秒数）缓存：来自 exercise_defaults，兜底推荐值
const defaults = reactive({})
function syncDefaults() {
  const ids = new Set()
  for (const dt of DAY_ORDER) {
    for (const slot of training.planByDay[dt] || []) ids.add(slot.exerciseId)
  }
  for (const exId of ids) {
    training.getExerciseDefault(exId).then(def => {
      defaults[exId] = {
        weightKg: def?.weightKg ?? null,
        seconds: def?.seconds ?? null
      }
    })
  }
}

// 新建/删除槽位后同步编辑态
function syncEdits() {
  const seen = new Set()
  for (const dt of DAY_ORDER) {
    for (const slot of training.planByDay[dt] || []) {
      seen.add(slot.id)
      editFor(slot)
    }
  }
  for (const id of Object.keys(edits)) {
    if (!seen.has(id)) delete edits[id]
  }
}

const savedAt = reactive({})
function flashSaved(slotId) {
  savedAt[slotId] = true
  setTimeout(() => { savedAt[slotId] = false }, 1800)
}

const isTimed = slot => slot.exercise?.special === 'seconds'
const isWeighted = slot => slot.exercise?.recommendedWeightKg != null
const weightValue = slot => defaults[slot.exerciseId]?.weightKg ?? slot.exercise.recommendedWeightKg ?? ''
const secondsValue = slot => defaults[slot.exerciseId]?.seconds ?? slot.exercise.recommendedSeconds ?? ''

function isFirst(slots, slot) { return slots[0]?.id === slot.id }
function isLast(slots, slot) { return slots[slots.length - 1]?.id === slot.id }

async function saveSlotField(dayType, slot, field) {
  const edit = edits[slot.id]
  const payload = {}
  if (field === 'targetSets') payload.targetSets = edit.targetSets || null
  if (field === 'reps') { payload.targetRepsMin = edit.reps || null; payload.targetRepsMax = edit.reps || null }
  flashSaved(slot.id)
  try {
    await training.savePlanSlot(dayType, slot.id, payload)
  } catch (e) {
    alert('保存失败：' + (e?.message || e))
  }
}

async function saveWeight(slot, e) {
  const v = parseFloat(e.target.value)
  flashSaved(slot.id)
  try {
    await training.savePlanWeightDefault(slot.exerciseId, { weightKg: Number.isFinite(v) ? v : null })
    syncDefaults()
  } catch (err) {
    alert('保存失败：' + (err?.message || err))
  }
}

async function saveSeconds(slot, e) {
  const v = parseFloat(e.target.value)
  flashSaved(slot.id)
  try {
    await training.savePlanWeightDefault(slot.exerciseId, { seconds: Number.isFinite(v) ? v : null })
    syncDefaults()
  } catch (err) {
    alert('保存失败：' + (err?.message || err))
  }
}

// ---- 选动作面板 ----
const picker = ref(null) // { mode: 'swap'|'add', dayType, slotId }
const usedIds = computed(() =>
  new Set((training.planByDay[picker.value?.dayType] || []).map(s => s.exerciseId))
)
const pickerTitle = computed(() => (picker.value?.mode === 'swap' ? '更换动作' : '添加动作'))
const pickerDayLabel = computed(() => PLAN_LABELS[picker.value?.dayType]?.label || '')

function openPicker(mode, dayType, slot) {
  picker.value = { mode, dayType, slotId: slot?.id || null }
}

async function onPickerSelect(exerciseId) {
  const p = picker.value
  if (!p) return
  picker.value = null
  try {
    if (p.mode === 'swap') await training.swapPlanExercise(p.dayType, p.slotId, exerciseId)
    else await training.addPlanExercise(p.dayType, exerciseId)
    syncEdits()
    syncDefaults() // 新动作的重量/秒数默认值
  } catch (e) {
    alert('操作失败：' + (e?.message || e))
  }
}

async function removeSlot(dayType, slot) {
  const label = PLAN_LABELS[dayType]?.label || dayType
  if (!confirm(`从「${label}」中移除「${slot.exercise.name}」？`)) return
  try {
    await training.removePlanExercise(dayType, slot.id)
    syncEdits()
  } catch (e) {
    alert('删除失败：' + (e?.message || e))
  }
}

// ---- AI Key ----
const keyInput = ref('')
const showKey = ref(false)
const savingKey = ref(false)
const newSessionting = ref(false)
const keyMsg = ref('')

async function saveKey() {
  savingKey.value = true
  keyMsg.value = ''
  try {
    await ai.saveApiKey(keyInput.value)
    keyInput.value = ai.apiKey
    keyMsg.value = '✅ Key 已保存（仅存本机）'
    setTimeout(() => { keyMsg.value = '' }, 3000)
  } catch (e) {
    keyMsg.value = '❌ 保存失败：' + (e?.message || e)
  } finally {
    savingKey.value = false
  }
}

async function createNewSession() {
  newSessionting.value = true
  keyMsg.value = ''
  try {
    await ai.createConversation()
    keyMsg.value = '✅ 新会话已建立（连接正常）'
    setTimeout(() => { keyMsg.value = '' }, 3000)
  } catch (e) {
    keyMsg.value = '❌ 创建失败：' + (e?.message || e)
  } finally {
    newSessionting.value = false
  }
}

const todayLabel = computed(() => {
  const map = { push: 'Push 推日', pull: 'Pull 拉日', legs: 'Legs 腿核日', rest: '休息日(有氧)' }
  return map[training.todayDayType]
})

async function doExport() {
  exporting.value = true
  try {
    const res = await exportAllData()
    exportResult.value = `✅ ${res.filename} (${(res.size / 1024).toFixed(1)} KB)`
  } catch (e) {
    console.error(e)
    exportResult.value = '导出失败：' + (e?.message || e)
  } finally {
    exporting.value = false
  }
}

async function confirmClear() {
  if (!confirm('确定清空所有训练记录、身体数据和有氧记录吗？此操作不可恢复！')) return
  if (!confirm('再次确认：真的要清空全部数据吗？')) return
  await initDatabase()
  await run('DELETE FROM training_logs')
  await run('DELETE FROM body_records')
  await run('DELETE FROM aerobic_logs')
  await run('DELETE FROM ai_messages') // 清 AI 会话，避免 AI 引用已删除数据的记忆
  await run('DELETE FROM ai_consult_records') // 清 AI 咨询记录列表
  await training.loadHistory()
  await ai.load() // 刷新会话为空 → 面板回到「尚未开始会话」
  alert('已清空全部数据')
}

async function doSaveProfile() {
  savingProfile.value = true
  profileSaved.value = ''
  try {
    await profile.save()
    profileSaved.value = '✅ 已保存'
    setTimeout(() => { profileSaved.value = '' }, 3000)
  } catch (e) {
    console.error('保存资料失败', e)
    profileSaved.value = '保存失败，请重试'
  } finally {
    savingProfile.value = false
  }
}

// 返回上一页（若无历史则回今日页）
function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.replace('/today')
  }
}

// 返回键由 App.vue 全局统一处理；顶部返回按钮走 goBack
onMounted(async () => {
  await training.init().catch(e => console.error('训练初始化失败', e))
  await Promise.all([
    profile.load().catch(e => console.error('资料加载失败', e)),
    body.load().catch(e => console.error('身体数据加载失败', e)),
    ai.load().catch(e => console.error('AI 配置加载失败', e))
  ])
  keyInput.value = ai.apiKey
  syncEdits()
  syncDefaults()
})
</script>

<style scoped>
/* 分组收折列表（常规 app 设置页样式） */
.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
/* 外观：三档主题分段（复用 .cycle-day 视觉语言：选中=橙底深字+光晕） */
.theme-seg {
  display: flex;
  gap: 8px;
}
.theme-seg-btn {
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
.theme-seg-btn.current {
  background: var(--accent);
  color: var(--on-accent);
  border-color: transparent;
  box-shadow: 0 4px 16px var(--accent-glow);
}
.theme-seg-btn:active {
  transform: scale(0.97);
}
.theme-seg-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.setting-group {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.setting-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  -webkit-tap-highlight-color: transparent;
}
.setting-row:active {
  background: var(--surface-hover);
}
.row-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.row-icon.accent {
  color: var(--accent);
}
.row-text {
  flex: 1;
  min-width: 0;
}
.row-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.row-sub {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-chevron {
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform 0.25s var(--easing);
}
.row-chevron.open {
  transform: rotate(180deg);
}
.setting-body {
  padding: 2px 16px 16px;
  border-top: 1px solid var(--border);
}
.settings-header {
  display: flex;
  align-items: center;
  margin-bottom:10px;
  gap: 2px;
}
.back-btn {
  background: none;
  border: none;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  margin-left: -10px;
  transition: color 0.2s, background 0.2s;
}
.back-btn:active {
  color: var(--accent);
  background: var(--accent-dim);
}
.back-icon {
  transform: rotate(180deg);
}
.plan-day-list {
  margin-top: 6px;
}
/* 训练计划二级折叠：日型行（点击展开该日动作配置，互斥） */
.plan-day-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 4px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  -webkit-tap-highlight-color: transparent;
}
.plan-day-row:active {
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
}
.plan-day-row-text {
  flex: 1;
  min-width: 0;
}
.plan-day-row-label {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--accent);
}
.plan-day-row-desc {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 1px;
}
.plan-day-row-count {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.plan-day-chevron {
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform 0.25s var(--easing);
}
.plan-day-chevron.open {
  transform: rotate(180deg);
}
.plan-day-body {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 2px 14px 8px;
  margin: 0 0 6px;
}
.plan-slot {
  border-top: 1px solid var(--border);
  padding: 7px 0 9px;
}
.plan-slot-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.plan-slot-name-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.plan-slot-name {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.plan-slot-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.plan-icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.plan-icon-btn:active:not(:disabled) {
  color: var(--accent);
  background: var(--surface-active);
}
.plan-icon-btn.danger:active {
  color: var(--danger);
  background: var(--danger-dim);
}
.plan-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.plan-slot-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 14px;
  margin-top: 5px;
}
.plan-slot-move {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}
.plan-slot-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: var(--text-secondary);
}
.slot-input {
  width: 60px;
  height: 30px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text-primary);
  padding: 0 8px;
  font-size: 14px;
  text-align: right;
  outline: none;
  transition: border-color 0.2s var(--easing);
}
.slot-input:focus {
  border-color: var(--accent);
}
.plan-act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 34px;
  min-width: 40px;
  padding: 0 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.plan-act-btn:active:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.plan-act-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.plan-act-btn.danger:active {
  border-color: var(--danger);
  color: var(--danger);
}
.plan-saved {
  font-size: 11px;
  color: var(--success);
  margin-left: 4px;
}
.plan-add-btn {
  width: 100%;
  min-height: 40px;
  margin-top: 6px;
  background: transparent;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s var(--easing);
}
.plan-add-btn:active {
  color: var(--accent);
  border-color: var(--accent);
}
.ai-key-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.ai-key-input {
  flex: 1;
  width: auto;
}
.ai-key-input.has-key {
  border-color: rgba(34, 197, 94, 0.5);
}
.plan-cycle {
  padding: 8px 0;
}
.cycle-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cycle-day {
  background: var(--surface-hover);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border);
}
.cycle-day.current {
  background: var(--accent);
  color: var(--on-accent);
  border-color: transparent;
  box-shadow: 0 4px 16px var(--accent-glow);
}
.cycle-arrow {
  color: var(--text-tertiary);
}
.cycle-note {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 12px;
}
.settings-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.settings-tip {
  margin-top: 10px;
  font-size: 13px;
  color: var(--success);
}
.settings-tip.error {
  color: var(--danger);
}
.settings-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.profile-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}
.profile-row:last-child {
  border-bottom: none;
}
.profile-row span:first-child {
  color: var(--text-secondary);
  flex-shrink: 0;
}
.profile-field {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
  min-width: 0;
  margin-left: 16px;
}
.profile-input {
  width: 92px;
  height: 36px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  padding: 0 10px;
  font-size: 14px;
  text-align: right;
  outline: none;
  transition: border-color 0.2s var(--easing);
}
.profile-input:focus {
  border-color: var(--accent);
}
.profile-input-flex {
  flex: 1;
  width: auto;
}
.profile-select {
  width: 120px;
  text-align: left;
}
.profile-unit {
  color: var(--text-tertiary);
  font-size: 12px;
  flex-shrink: 0;
}
.profile-static {
  color: var(--text-primary);
  font-weight: 600;
}
.profile-save {
  width: 100%;
  margin-top: 14px;
  min-height: 44px;
}
</style>

<template>
  <div class="today-view">
    <!-- 头部（sticky 冻结，右侧显示今日进度 x/x） -->
    <div class="page-header today-head">
      <div>
        <h1>今日训练</h1>
        <div class="subtitle">{{ dayLabel }} · {{ dayDescription }}</div>
      </div>
      <div v-if="showProgress" class="head-progress num">{{ progress.done }} / {{ progress.total }}</div>
    </div>

    <!-- 加载中 -->
    <div v-if="training.isLoading" class="empty-state">
      <div class="empty-icon">⏳</div>
      <div>加载中...</div>
    </div>

    <!-- 休息日 -->
    <div v-else-if="training.todayDayType === 'rest'" class="empty-state">
      <AppIcon name="heart" :size="52" style="color: var(--text-tertiary); margin-bottom: 12px" />
      <h3 style="margin-bottom:8px">今天是休息日</h3>
      <p>不做力量训练，去做点有氧放松恢复吧</p>
      <router-link to="/aerobic" replace class="btn btn-primary" style="margin-top:16px; text-decoration:none">
        去记录有氧
        <AppIcon name="arrow-right" :size="18" />
      </router-link>
    </div>

    <!-- 训练日 -->
    <template v-else>
      <!-- 今日已完成状态 -->
      <div v-if="training.hasTodayLog" class="empty-state done-state">
        <AppIcon name="check" :size="52" style="color: var(--success); margin-bottom: 12px" />
        <h3 style="margin-bottom:8px">今日训练已完成</h3>
        <p>共记录 {{ training.todayLogs.length }} 组</p>
        <router-link :to="'/history/' + todayStr()" class="btn btn-primary" style="margin-top:16px; text-decoration:none">
          查看今日训练记录
          <AppIcon name="arrow-right" :size="18" />
        </router-link>
      </div>

      <!-- 未完成：训练计划 -->
      <template v-else>
        <!-- 动作列表 -->
        <div class="exercise-list">
          <div v-for="(wde, idx) in training.todayExercises" :key="wde.exerciseId" class="card exercise-card"
               :class="{ 'is-warmup': wde.exercise.category === 'warmup' }">
            <!-- 动作头 -->
            <div class="exercise-head" @click="toggleExpand(idx)">
              <div class="exercise-info">
                <div class="exercise-name-row">
                  <span class="exercise-name">{{ wde.exercise.name }}</span>
                  <span v-if="wde.exercise.category === 'warmup'" class="badge badge-orange">热身</span>
                </div>
                <div class="exercise-meta">
                  <span>{{ setCount(idx) || wde.targetSets }}组 × {{ repsLabel(wde) }}</span>
                  <span v-if="wde.exercise.isMachine" class="tag">器械</span>
                  <span v-else class="tag">自由</span>
                </div>
              </div>
              <AppIcon :name="expandedIdx === idx ? 'chevron-down' : 'chevron-right'"
                       :size="18" style="color: var(--text-tertiary)" />
            </div>

            <!-- 教学入口 -->
            <button class="teach-btn" @click="openTeach(wde.exercise)">
              <AppIcon name="teach" :size="16" />
              <span>查看动作教学</span>
            </button>

            <!-- 展开详情：记录输入 -->
            <div v-if="expandedIdx === idx" class="exercise-detail">
              <!-- 计时类（平板支撑）：每组一个秒数输入 -->
              <div v-if="isWarmupOrPlank(wde)" class="timed-rows">
                <div v-for="set in setNums(idx)" :key="set" class="timed-row">
                  <span class="set-num" :class="{ pressed: pressTarget === idx + ':' + set }"
                        @pointerdown="startSetPress(idx, set)"
                        @pointerup="cancelSetPress"
                        @pointerleave="cancelSetPress"
                        @pointercancel="cancelSetPress">第{{ set }}组</span>
                  <span class="timed-label">坚持</span>
                  <input type="number" inputmode="numeric" class="set-input" placeholder="秒数"
                         v-model.number="setInputs[idx][set].reps">
                  <button class="set-done-btn" :class="{ active: setInputs[idx][set].done }"
                          @click="toggleSetDone(idx, set)">
                    <AppIcon v-if="setInputs[idx][set].done" name="check" :size="16" />
                    <span>{{ setInputs[idx][set].done ? '完成' : '标记' }}</span>
                  </button>
                </div>
              </div>
              <!-- 负重/热身：每组次数（负重动作额外显示重量，热身自重不显示） -->
              <div v-else class="set-rows">
                <div v-for="set in setNums(idx)" :key="set" class="set-row">
                  <span class="set-num" :class="{ pressed: pressTarget === idx + ':' + set }"
                        @pointerdown="startSetPress(idx, set)"
                        @pointerup="cancelSetPress"
                        @pointerleave="cancelSetPress"
                        @pointercancel="cancelSetPress">第{{ set }}组</span>
                  <template v-if="showWeight(wde)">
                    <input type="number" inputmode="decimal" class="set-input" :placeholder="weightPlaceholder(wde)"
                           v-model.number="setInputs[idx][set].weight">
                    <span class="set-times">×</span>
                  </template>
                  <input type="number" inputmode="numeric" class="set-input" placeholder="次数"
                         v-model.number="setInputs[idx][set].reps">
                  <button class="set-done-btn" :class="{ active: setInputs[idx][set].done }"
                          @click="toggleSetDone(idx, set)">
                    <AppIcon v-if="setInputs[idx][set].done" name="check" :size="16" />
                    <span>{{ setInputs[idx][set].done ? '完成' : '标记' }}</span>
                  </button>
                </div>
              </div>
              <!-- 手动加一组：点击后追加一行，并把新组数写入该动作配置（默认新组数） -->
              <button class="add-set-btn" @click="addSet(idx)">
                <AppIcon name="plus" :size="14" />
                <span>加一组</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 今日训练已完成（统一保存） -->
        <button v-if="markedSets > 0" class="btn btn-primary finish-btn" @click="finishWorkout">
          <AppIcon name="fire" :size="20" />
          <span>今日训练已完成</span>
        </button>
      </template>
    </template>

    <!-- 动作教学底部弹出层 -->
    <div v-if="teachExercise" class="teach-overlay" @click.self="teachExercise = null">
      <div class="teach-sheet">
        <div class="teach-header">
          <div>
            <div class="teach-name">{{ teachExercise.name }}</div>
            <div class="teach-muscle">{{ teachExercise.targetMuscle }}</div>
          </div>
          <button class="teach-close" @click="teachExercise = null">
            <AppIcon name="close" :size="16" />
          </button>
        </div>

        <div class="teach-body">
          <div v-if="teachExercise.imageAssetPath" class="teach-img">
            <img :src="teachExercise.imageAssetPath" :alt="teachExercise.name">
          </div>
          <div v-else-if="teachExercise.videoUrl" class="teach-video">
            <iframe :src="teachExercise.videoUrl" frameborder="0" allowfullscreen></iframe>
          </div>

          <div class="teach-section">
            <div class="teach-section-title">动作步骤</div>
            <pre class="teach-text">{{ teachExercise.instructions }}</pre>
          </div>

          <div class="teach-section" v-if="teachExercise.commonMistakes">
            <div class="teach-section-title">常见错误</div>
            <pre class="teach-text">{{ teachExercise.commonMistakes }}</pre>
          </div>

          <div class="teach-section" v-if="teachExercise.tips">
            <div class="teach-section-title">小贴士</div>
            <pre class="teach-text">{{ teachExercise.tips }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 动作教学面板纳入返回键 -->
    <BackLayer :show="!!teachExercise" @back="teachExercise = null" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTrainingStore } from '../stores/training'
import { todayStr } from '../database'
import { SEED_WORKOUT_PLAN } from '../database/seed'
import { KeepAwake } from '@capacitor-community/keep-awake'
import AppIcon from '../components/AppIcon.vue'
import BackLayer from '../components/BackLayer.vue'

const training = useTrainingStore()

const expandedIdx = ref(null)
const teachExercise = ref(null)

// 组输入状态 { exerciseIdx: { setNum: {weight, reps, done} } }
const setInputs = reactive({})

// 临时库防丢：true 后才开始把输入落盘（避免预填骨架阶段误写入）；保存节流用 saveTimer
const draftReady = ref(false)
let saveTimer = null

const dayLabel = computed(() => {
  const p = SEED_WORKOUT_PLAN.find(d => d.dayType === training.todayDayType)
  return p ? p.label : ''
})
const dayDescription = computed(() => {
  const p = SEED_WORKOUT_PLAN.find(d => d.dayType === training.todayDayType)
  return p ? p.description : ''
})

// 计时动作判定（仅平板支撑按秒记录；热身动作为自重，按次数）
function isWarmupOrPlank(wde) {
  return wde.special === 'seconds' || wde.exercise?.special === 'seconds'
}

// 动作目标强度文案：计时动作显示秒数（如"45s"），其余显示次数区间
function repsLabel(wde) {
  if (isWarmupOrPlank(wde)) {
    const s = wde.targetRepsMin ?? wde.exercise?.recommendedSeconds
    return s ? `${s}s` : '计时'
  }
  return `${wde.targetRepsMin ?? '-'}-${wde.targetRepsMax ?? '-'}次`
}

// 某动作当前输入的行号列表（升序），驱动每组输入渲染与进度统计
function setNums(idx) {
  const s = setInputs[idx]
  if (!s) return []
  return Object.keys(s).map(Number).sort((a, b) => a - b)
}

// 当前行数（初始化前返回 0，模板用 || 兜底到计划组数）
function setCount(idx) {
  return setNums(idx).length
}

// 负重动作（有建议重量）才显示重量输入框；自重动作（仰卧举腿/器械举腿等，含纯自重器械）只填次数
function showWeight(wde) {
  return wde.exercise.recommendedWeightKg != null
}

// 重量输入占位符：器械显示"配重kg"，自由重量显示"单边kg"
function weightPlaceholder(wde) {
  return wde.exercise.isMachine ? '配重kg' : '单边kg'
}

// 已标记完成的组数（驱动进度条与"今日训练已完成"按钮显隐）
const markedSets = computed(() => {
  let count = 0
  for (const idx of Object.keys(setInputs)) {
    for (const setStr of Object.keys(setInputs[idx] || {})) {
      if (setInputs[idx][setStr]?.done) count++
    }
  }
  return count
})

// 今日进度（基于实际输入行数，标题右侧显示 done / total；加组后 total 自动变大）
const progress = computed(() => {
  const total = training.todayExercises.reduce((s, e, i) => s + setCount(i), 0)
  const done = markedSets.value
  return { total, done }
})

// 标题右侧 x/x 的显示条件：与原进度卡一致 —— 训练日（有目标组数）且今日未完成
const showProgress = computed(() => progress.value.total > 0 && !training.hasTodayLog)

function toggleExpand(idx) {
  expandedIdx.value = expandedIdx.value === idx ? null : idx
}

function openTeach(ex) {
  teachExercise.value = ex
}

function toggleSetDone(idx, setNum) {
  if (!setInputs[idx]) setInputs[idx] = {}
  if (!setInputs[idx][setNum]) setInputs[idx][setNum] = { weight: null, reps: null, done: false }
  const s = setInputs[idx][setNum]
  s.done = !s.done
}

// 统一保存今日所有已标记完成的组（每动作一组记录，无单动作保存）；成功后清空临时库
async function finishWorkout() {
  const count = await training.saveAllToday(setInputs)
  if (count > 0) {
    await training.clearTodayDraft()
    draftReady.value = false
    expandedIdx.value = null
  }
}

// 手动加一组：追加一行输入（沿用上一组值），并把新组数写入该动作配置（默认新组数）
async function addSet(idx) {
  const wde = training.todayExercises[idx]
  if (!wde) return
  if (!setInputs[idx]) setInputs[idx] = {}
  const nums = setNums(idx)
  const next = nums.length ? Math.max(...nums) + 1 : 1
  const prev = nums.length ? setInputs[idx][nums[nums.length - 1]] : null
  setInputs[idx][next] = {
    weight: prev?.weight ?? null,
    reps: prev?.reps ?? null,
    done: false
  }
  // 持久化新组数：写动作库配置（保留已有重量/次数/秒数配置）
  const def = await training.getExerciseDefault(wde.exerciseId)
  await training.saveExerciseDefault({
    exerciseId: wde.exerciseId,
    weightKg: def?.weightKg ?? null,
    reps: def?.reps ?? null,
    seconds: def?.seconds ?? null,
    targetSets: next
  })
}

// 长按"第N组"删除该组：按 500ms 弹确认（仅剩 1 组时不可删）
const pressTarget = ref('')
let pressTimer = null

function startSetPress(idx, set) {
  if (setNums(idx).length <= 1) return // 不能删到 0 组
  pressTarget.value = idx + ':' + set
  clearTimeout(pressTimer)
  pressTimer = setTimeout(() => {
    pressTarget.value = ''
    if (confirm('删除第' + set + '组？')) {
      confirmDeleteSet(idx, set)
    }
  }, 500)
}

function cancelSetPress() {
  clearTimeout(pressTimer)
  pressTarget.value = ''
}

// 删除一组：移除输入行 → 清理临时库对应行 → 组数默认值写回新总数（与"加一组"对称）
async function confirmDeleteSet(idx, set) {
  const wde = training.todayExercises[idx]
  const exerciseId = wde.exerciseId
  delete setInputs[idx][set]                    // ① 移除行：进度/标记数自动重算，深 watcher 自动写回剩余组
  await training.removeDraftSet(exerciseId, set) // ② 清理临时库该行，防闪退重开时残留恢复
  const next = setNums(idx).length               // ③ 组数默认值 = 剩余组数
  const def = await training.getExerciseDefault(exerciseId)
  await training.saveExerciseDefault({
    exerciseId,
    weightKg: def?.weightKg ?? null,
    reps: def?.reps ?? null,
    seconds: def?.seconds ?? null,
    targetSets: next
  })
  navigator.vibrate?.(30) // 轻震反馈
}

// 初始化今日输入骨架：默认值优先级（上次训练 > 动作库配置 > 系统默认），再叠加当天临时库
async function initSetInputs() {
  const draft = await training.loadTodayDraft()
  for (let idx = 0; idx < training.todayExercises.length; idx++) {
    const wde = training.todayExercises[idx]
    if (!setInputs[idx]) setInputs[idx] = {}
    const eff = await training.getEffectiveDefaults(wde.exerciseId, wde)
    for (const setNum of eff.setNumbers) {
      if (!setInputs[idx][setNum]) {
        const p = eff.perSet[setNum] || {}
        setInputs[idx][setNum] = { weight: p.weightKg ?? null, reps: p.reps ?? null, done: false }
      }
    }
    // 叠加当天临时库：闪退恢复时以已录入内容为准（含额外加的组与标记状态）
    const d = draft[wde.exerciseId]
    if (d) {
      for (const setStr of Object.keys(d)) {
        const s = d[setStr]
        setInputs[idx][setStr] = { weight: s.weightKg ?? null, reps: s.reps ?? null, done: !!s.done }
      }
    }
  }
  draftReady.value = true
}

// 输入防抖落盘临时库：标记/取消、填重量次数、加组都会触发；300ms 内合并写入
watch(setInputs, () => {
  if (!draftReady.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    training.saveAllDraft(setInputs, training.todayExercises).catch(() => {})
  }, 300)
}, { deep: true })

// 跨天/前台恢复：今日动作列表已轮换（store.syncToToday 触发）→ 重建输入骨架。
// 丢弃旧日的输入状态，预填新日计划（上次训练 > 配置 > 默认）。
// 首次挂载由 onMounted 的 initSetInputs 处理（draftReady 尚为 false），此处不重复。
watch(
  () => training.todayExercises.map(w => w.exerciseId).join(',') + '|' + training.todayDayType,
  async () => {
    if (!draftReady.value) return
    for (const k of Object.keys(setInputs)) delete setInputs[k]
    draftReady.value = false // 重建期间禁止防抖落盘，避免把旧输入写进新一天的临时库
    await initSetInputs()
  }
)

onMounted(async () => {
  await training.init()
  await initSetInputs()
  // 训练时保持屏幕常亮，防止自动熄屏
  KeepAwake.keepAwake().catch(() => {})
})

onUnmounted(async () => {
  // 离开页面/正常退出前把未落盘的输入补写临时库（防抖中的最后改动不丢）
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
    try {
      await training.saveAllDraft(setInputs, training.todayExercises)
    } catch (e) { /* 忽略写失败 */ }
  }
  KeepAwake.allowSleep().catch(() => {})
})
</script>

<style scoped>
.today-view {
  padding-bottom: 24px;
}

/* 今日页标题：左侧标题 + 右侧 x/x 进度 */
.today-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.head-progress {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-strong);
  background: var(--accent-dim);
  border: 1px solid rgba(249, 115, 22, 0.3);
  padding: 5px 12px;
  border-radius: 20px;
}

.exercise-list {
  padding: 10px 16px;
}
.exercise-card {
  margin-bottom: 10px;
  padding: 14px 16px;
  transition: border-color 0.2s var(--easing);
}
.exercise-card.is-warmup {
  border-color: rgba(249, 115, 22, 0.25);
}
.exercise-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  min-height: 44px;
}
.exercise-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.exercise-name {
  font-size: 15px;
  font-weight: 600;
}
.exercise-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.teach-btn {
  width: 100%;
  margin-top: 10px;
  background: var(--surface-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 9px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s var(--easing);
}
.teach-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-dim);
}

.exercise-detail {
  margin-top: 12px;
}
.set-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.set-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.set-num {
  width: 52px;
  font-size: 12px;
  color: var(--text-secondary);
  flex-shrink: 0;
  font-weight: 500;
  /* 长按删除：防止触发文本选择 / 系统长按菜单 / 图片 callout */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  cursor: default;
}
.set-num.pressed {
  color: var(--danger);
}
.set-times {
  color: var(--text-secondary);
}
.set-done-btn {
  flex-shrink: 0;
  min-height: 46px;
  min-width: 72px;
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.set-done-btn.active {
  background: var(--success-dim);
  border-color: rgba(34, 197, 94, 0.4);
  color: var(--success);
}
.timed-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timed-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.timed-label {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.add-set-btn {
  margin-top: 10px;
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
.add-set-btn:active {
  color: var(--accent);
  border-color: var(--accent);
}
.finish-btn {
  width: calc(100% - 32px);
  margin: 20px 16px 8px;
  padding: 14px;
  font-size: 16px;
}

/* 教学底部弹层 */
.teach-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 900;
}
.teach-sheet {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  padding: 20px 20px calc(24px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--border-strong);
}
.teach-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}
.teach-name {
  font-size: 18px;
  font-weight: 700;
}
.teach-muscle {
  font-size: 13px;
  color: var(--accent);
  margin-top: 2px;
}
.teach-close {
  background: var(--surface-hover);
  border: none;
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.teach-img {
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.teach-img img {
  width: 100%;
  display: block;
}
.teach-video {
  aspect-ratio: 16/9;
  margin-bottom: 16px;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.teach-video iframe {
  width: 100%;
  height: 100%;
}
.teach-section {
  margin-bottom: 16px;
}
.teach-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.teach-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}
</style>

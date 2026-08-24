<template>
  <div class="card cal-card">
    <!-- 月份切换 -->
    <div class="cal-head">
      <button class="cal-nav" aria-label="上个月" @click="prevMonth">
        <AppIcon name="chevron-right" :size="18" class="rot-180" />
      </button>
      <span class="cal-title">{{ viewYear }}年{{ viewMonth + 1 }}月</span>
      <button class="cal-nav" aria-label="下个月" @click="nextMonth">
        <AppIcon name="chevron-right" :size="18" />
      </button>
    </div>

    <!-- 星期表头（周一开头） -->
    <div class="cal-week">
      <span v-for="w in WEEK_LABELS" :key="w" class="cal-week-label">{{ w }}</span>
    </div>

    <!-- 月网格 -->
    <div class="cal-grid">
      <div v-for="(cell, i) in cells" :key="i" class="cal-cell"
           :class="{
             out: cell.out,
             today: cell.isToday,
             canpress: !cell.out,
             ['type-' + cell.dayType]: !cell.out
           }"
           @pointerdown="onCellPointerDown($event, cell)"
           @pointermove="onCellPointerMove"
           @pointerup="onCellPointerUp"
           @pointercancel="onCellPointerCancel"
           @click="onClickCell(cell)">
        <template v-if="!cell.out">
          <div class="cal-top">
            <span class="cal-num">{{ cell.day }}</span>
            <span v-if="cell.statusDot" class="cal-dot" :class="cell.statusDot"></span>
          </div>
          <span class="cal-type">{{ cell.dayTypeShort }}</span>
        </template>
      </div>
    </div>

    <!-- 图例 + 手势提示 -->
    <div class="cal-legend">
      <span class="legend-item"><span class="cal-dot ok"></span>已完成</span>
      <span class="legend-item"><span class="cal-dot miss"></span>漏练</span>
      <span class="legend-item legend-today">■ 今天</span>
    </div>
  </div>

  <!-- 停练顺延底部面板 -->
  <div v-if="postponeOpen" class="sheet-overlay" @click.self="closePostpone">
    <div class="sheet">
      <div class="sheet-header">
        <div>
          <div class="sheet-title">停练顺延</div>
          <div class="sheet-sub">{{ postponeDateLabel }}起练三休一计划后移 1 天</div>
        </div>
        <button class="sheet-close" aria-label="关闭" @click="closePostpone">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="sheet-body">
        <p class="sheet-hint">
          顺延后，{{ postponeDateLabel }}（{{ startDateDisplay }}）变为
          <span class="sheet-preview">{{ previewLabel }}</span>，
          之前日期保持不变，后续排期整体后移 1 天。
        </p>
        <p class="sheet-sub-note">已完成的训练记录不受影响。</p>
      </div>

      <div class="sheet-actions">
        <button class="btn sheet-cancel" @click="closePostpone">取消</button>
        <button class="btn btn-primary" :disabled="postponing" @click="confirmPostpone">
          {{ postponing ? '顺延中…' : '确认顺延' }}
        </button>
      </div>
    </div>
  </div>

  <!-- 漏练判断起始日底部面板 -->
  <div v-if="missStartOpen" class="sheet-overlay" @click.self="closeMissStart">
    <div class="sheet">
      <div class="sheet-header">
        <div>
          <div class="sheet-title">漏练判断起始日</div>
          <div class="sheet-sub">当前自 {{ missStartDisplay }} 起判断漏练</div>
        </div>
        <button class="sheet-close" aria-label="关闭" @click="closeMissStart">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="sheet-body">
        <p class="sheet-hint">
          将从 {{ missStartCellDisplay }} 开始判断漏练，
          早于此日期的训练日不再标橙色点。
        </p>
        <p class="sheet-sub-note">已完成的训练记录不受影响。</p>
      </div>

      <div class="sheet-actions">
        <button class="btn sheet-secondary" :disabled="missStartSaving" @click="setMissStartToday">设为今天</button>
        <button class="btn sheet-cancel" :disabled="missStartSaving" @click="closeMissStart">取消</button>
        <button class="btn btn-primary" :disabled="missStartSaving" @click="confirmMissStart">
          {{ missStartSaving ? '保存中…' : '从此日开始' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useTrainingStore } from '../stores/training'
import { todayStr } from '../database'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['select-date'])
const training = useTrainingStore()

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const TYPE_SHORT = { push: '推', pull: '拉', legs: '腿', rest: '休' }

const historyByDate = computed(() => training.historyByDate)

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 当前视图月网格（周一起始，前后补白）
const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startOffset = (first.getDay() + 6) % 7 // 周一=0
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const today = todayStr()
  const list = []
  for (let i = 0; i < totalCells; i++) {
    const day = i - startOffset + 1
    if (day < 1 || day > daysInMonth) {
      list.push({ out: true })
      continue
    }
    const dateStr = fmtDate(new Date(viewYear.value, viewMonth.value, day))
    const dayType = training.getDayTypeForDate(dateStr)
    const isToday = dateStr === today
    let statusDot = null
    if (!isToday) {
      if (historyByDate.value[dateStr]?.length > 0) statusDot = 'ok'
      // 漏练：仅从安装后的 missStartDate 起判断，早于该日期的历史日不标橙
      else if (dateStr < today && dateStr >= training.missStartDate && dayType !== 'rest') statusDot = 'miss'
    }
    list.push({
      out: false,
      dateStr,
      day,
      dayType,
      dayTypeShort: TYPE_SHORT[dayType] || dayType,
      statusDot,
      isToday,
      longPressable: true
    })
  }
  return list
})

function prevMonth() {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value-- }
  else viewMonth.value--
}
function nextMonth() {
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++ }
  else viewMonth.value++
}

// 长按手势（pointer 事件）：500ms 触发，位移 >10px / 滚动 / 松开均取消
const PRESS_MS = 500
const MOVE_TOLERANCE = 10
let pressCell = null
let pressTimer = null
let startX = 0
let startY = 0
let longPressFired = false

function onCellPointerDown(e, cell) {
  if (cell.out) return
  e.currentTarget.setPointerCapture(e.pointerId)
  pressCell = cell
  startX = e.clientX
  startY = e.clientY
  longPressFired = false
  pressTimer = setTimeout(() => {
    longPressFired = true
    pressCell = null
    pressTimer = null
    // 过去日期 → 调整漏练起始日；今天/未来 → 停练顺延
    if (cell.dateStr >= todayStr()) openPostpone()
    else openMissStart(cell)
  }, PRESS_MS)
}

function onCellPointerMove(e) {
  if (!pressCell) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (Math.hypot(dx, dy) > MOVE_TOLERANCE) clearPress()
}

function onCellPointerUp() {
  clearPress()
}
function onCellPointerCancel() {
  clearPress()
}

function clearPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
  pressCell = null
}

function onClickCell(cell) {
  if (cell.out) return
  if (longPressFired) { longPressFired = false; return }
  emit('select-date', cell.dateStr)
}

// 日期显示帮助：'YYYY-MM-DD' → 'M月D日'
function mdDisplay(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}月${Number(d)}日`
}

// 停练顺延底部面板
const postponeOpen = ref(false)
const postponing = ref(false)
const postponeDateLabel = computed(() =>
  training.postponeStartDate === todayStr() ? '今天' : '明天'
)
const startDateDisplay = computed(() => mdDisplay(training.postponeStartDate))
const previewLabel = computed(() => {
  const t = training.getDayTypeForDate(
    training.postponeStartDate,
    training.effectiveOffsetFor(training.postponeStartDate) + 1
  )
  return TYPE_SHORT[t] || t
})

function openPostpone() {
  postponeOpen.value = true
}
function closePostpone() {
  if (postponing.value) return
  postponeOpen.value = false
}
async function confirmPostpone() {
  postponing.value = true
  try {
    await training.postponeSchedule()
    postponeOpen.value = false
  } finally {
    postponing.value = false
  }
}

// 漏练判断起始日底部面板
const missStartOpen = ref(false)
const missStartCell = ref(null)
const missStartSaving = ref(false)
const missStartDisplay = computed(() => mdDisplay(training.missStartDate))
const missStartCellDisplay = computed(() => mdDisplay(missStartCell.value?.dateStr || ''))

function openMissStart(cell) {
  missStartCell.value = cell
  missStartOpen.value = true
}
function closeMissStart() {
  if (missStartSaving.value) return
  missStartOpen.value = false
  missStartCell.value = null
}
async function confirmMissStart() {
  if (!missStartCell.value) return
  missStartSaving.value = true
  try {
    await training.setMissStart(missStartCell.value.dateStr)
    missStartOpen.value = false
    missStartCell.value = null
  } finally {
    missStartSaving.value = false
  }
}
async function setMissStartToday() {
  missStartSaving.value = true
  try {
    await training.setMissStart(todayStr())
    missStartOpen.value = false
    missStartCell.value = null
  } finally {
    missStartSaving.value = false
  }
}

onBeforeUnmount(clearPress)
</script>

<style scoped>
.cal-card {
  margin: 0 16px 16px;
  padding: 14px 16px;
}
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.cal-title {
  font-size: 15px;
  font-weight: 600;
}
.cal-nav {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.cal-nav:active {
  transform: scale(0.94);
  color: var(--accent);
  border-color: var(--accent);
}
.rot-180 {
  transform: rotate(180deg);
}
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
}
.cal-week-label {
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cal-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 52px;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  background: var(--surface-hover);
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.cal-cell.out {
  background: transparent;
}
.cal-cell.canpress {
  cursor: pointer;
}
.cal-cell:not(.out):active {
  background: var(--surface-active);
}
.cal-cell.today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}
/* 类型底色填充：低透明度同色系，深色下保持对比度。
   注意避开语义标记色：橙(漏练)/绿(已完成)，否则状态点会被底色吃掉。
   因此 推=红 拉=蓝 腿=紫 休=灰 */
.cal-cell.type-push {
  background: rgba(248, 113, 113, 0.14);
}
.cal-cell.type-pull {
  background: rgba(56, 189, 248, 0.14);
}
.cal-cell.type-legs {
  background: rgba(167, 139, 250, 0.14);
}
.cal-cell.type-rest {
  background: rgba(148, 163, 184, 0.1);
}
.cal-cell.today.type-push,
.cal-cell.today.type-pull,
.cal-cell.today.type-legs,
.cal-cell.today.type-rest {
  box-shadow: inset 0 0 0 1.5px var(--accent), inset 0 0 12px rgba(249, 115, 22, 0.25);
}
.cal-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cal-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.cal-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  /* 深色描边：让绿/橙状态点在彩色类型底上依然清晰 */
  box-shadow: 0 0 0 1.5px var(--bg-deep);
}
.cal-dot.ok {
  background: var(--success);
}
.cal-dot.miss {
  background: var(--warning);
}
.cal-type {
  font-size: 11px;
  text-align: center;
}
.cal-type.push {
  color: #f87171;
}
.cal-type.pull {
  color: #38bdf8;
}
.cal-type.legs {
  color: #a78bfa;
}
.cal-type.rest {
  color: var(--text-tertiary);
}
.cal-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.legend-today {
  color: var(--accent);
}

/* 底部面板（复用教学弹层样式） */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 6, 10, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 900;
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
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sheet-hint {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-primary);
}
.sheet-preview {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-weight: 600;
  margin: 0 2px;
}
.sheet-sub-note {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}
.sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 22px;
}
.sheet-actions .btn {
  flex: 1;
}
.sheet-cancel {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
}
.sheet-secondary {
  background: var(--accent-dim);
  border: 1px solid rgba(249, 115, 22, 0.3);
  color: var(--accent-strong);
}
</style>

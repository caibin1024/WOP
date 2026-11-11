<template>
  <div class="history-view">
    <div class="page-header history-header">
      <div>
        <h1>记录</h1>
        <!-- 副标题只统计力量口径：纯有氧日不算"训练天数"，有氧次数看下方累计卡 -->
        <div class="subtitle">共 {{ totalDays }} 天训练 · {{ totalSets }} 组</div>
      </div>
    </div>

    <!-- 训练日历：标注计划类型 + 是否如期训练 + 有氧打卡（天蓝点），长按顺延 -->
    <CalendarCard :aerobic-dates="aerobicDates" @select-date="onCalendarSelect" />

    <!-- 有氧累计（统计跟记录走）：有记录才占屏 -->
    <div v-if="aerobic.logs.length" class="card aero-stats">
      <div class="card-title">有氧累计</div>
      <div class="aero-stats-grid">
        <!-- 四块静态结构（不用 v-for，直白可靠），数据全在 aerobic store 现成 computed -->
        <div class="aero-stat">
          <span class="aerobic-type type-swim">游泳</span>
          <div class="aero-stat-num num">{{ (aerobic.swimTotalDistance / 1000).toFixed(1) }} km</div>
          <div class="aero-stat-sub num">{{ aerobic.swimTotalSessions }} 次</div>
        </div>
        <div class="aero-stat">
          <span class="aerobic-type type-stair">爬楼机</span>
          <div class="aero-stat-num num">{{ aerobic.stairTotalDistance.toFixed(1) }} km</div>
          <div class="aero-stat-sub num">{{ aerobic.stairTotalSessions }} 次</div>
        </div>
        <div class="aero-stat">
          <span class="aerobic-type type-treadmill">跑步机</span>
          <div class="aero-stat-num num">{{ aerobic.treadmillTotalDistance.toFixed(1) }} km</div>
          <div class="aero-stat-sub num">{{ aerobic.treadmillTotalSessions }} 次</div>
        </div>
        <div class="aero-stat">
          <span class="aerobic-type type-bike">动感单车</span>
          <div class="aero-stat-num num">{{ aerobic.bikeTotalDistance.toFixed(1) }} km</div>
          <div class="aero-stat-sub num">{{ aerobic.bikeTotalSessions }} 次</div>
        </div>
      </div>
    </div>

    <!-- 历史时间线（训练 + 有氧按日期混排，倒序）：有训练的日期点击进明细，纯有氧日只读 -->
    <div class="history-list">
      <div v-for="date in mergedDates" :key="date" class="card history-card"
           :class="{ highlighted: highlightDate === date, 'aerobic-only': !hasTraining(date) }"
           :data-date="date" :ref="setDateEl" @click="hasTraining(date) && goDetail(date)">
        <div class="history-date-row">
          <span class="history-date">{{ formatDate(date) }}</span>
          <span class="history-daytype">{{ dayChip(date) }}</span>
          <span class="history-sets num">{{ dayCountLabel(date) }}</span>
          <AppIcon v-if="hasTraining(date)" class="history-arrow" name="chevron-right" :size="16" />
        </div>
        <div v-if="hasTraining(date)" class="history-summary">
          <span v-for="s in dateSummary(date)" :key="s.name" class="summary-item">
            {{ s.name }} <b class="num">{{ s.count }}组</b>
          </span>
        </div>
        <!-- 有氧行：行内删除 .stop，防误触整卡下钻 -->
        <div v-for="l in (aerobicByDate[date] || [])" :key="l.id" class="aerobic-row">
          <span class="aerobic-type" :class="'type-' + l.type">{{ typeLabel(l.type) }}</span>
          <span class="aerobic-main num">{{ mainMetric(l) }}</span>
          <span class="aerobic-sub num">{{ l.durationMin }}分</span>
          <span v-if="l.afterStrength" class="aerobic-tag">力量后</span>
          <button class="del-btn" @click.stop="removeAerobic(l.id)" aria-label="删除">
            <AppIcon name="trash" :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="mergedDates.length === 0" class="empty-state">
      <AppIcon name="chart" :size="44" style="color: var(--text-tertiary)" />
      <div style="margin-top:12px">还没有训练或有氧记录，去开始第一次训练吧！</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '../stores/training'
import { useAerobicStore } from '../stores/aerobic'
import { SEED_WORKOUT_PLAN } from '../database/seed'
import AppIcon from '../components/AppIcon.vue'
import CalendarCard from '../components/CalendarCard.vue'

const route = useRoute()
const router = useRouter()
const training = useTrainingStore()
const aerobic = useAerobicStore()

const historyByDate = computed(() => training.historyByDate)

// 有氧按日期分桶
const aerobicByDate = computed(() => {
  const m = {}
  for (const l of aerobic.logs) (m[l.date] = m[l.date] || []).push(l)
  return m
})
// 预计算 Set 传给 CalendarCard：.has() 在它的 cells computed 里执行，模板零表达式
const aerobicDates = computed(() => new Set(aerobic.logs.map(l => l.date)))

// 时间线：训练日 ∪ 有氧日，日期倒序
const mergedDates = computed(() =>
  [...new Set([...Object.keys(historyByDate.value), ...Object.keys(aerobicByDate.value)])].sort().reverse()
)

const totalDays = computed(() => Object.keys(historyByDate.value).length)
const totalSets = computed(() => Object.values(historyByDate.value).reduce((s, logs) => s + logs.length, 0))

// 模板判空统一走这里：混排后纯有氧日 historyByDate[date] 是 undefined，
// 模板直接取 .length 会在渲染时抛错、整块记录页消失（见 CLAUDE.md 前端坑）
function hasTraining(date) {
  return (historyByDate.value[date]?.length ?? 0) > 0
}

// 日期卡右侧计数：有训练报组数，有有氧报次数，两者都有并列显示
function dayCountLabel(date) {
  const parts = []
  const t = historyByDate.value[date]?.length || 0
  const a = aerobicByDate.value[date]?.length || 0
  if (t) parts.push(`${t} 组`)
  if (a) parts.push(`有氧 ${a} 次`)
  return parts.join(' · ')
}

// 动作概要：按动作分组统计组数（主页面只显示概要）
function dateSummary(date) {
  const logs = historyByDate.value[date] || []
  const byEx = {}
  const order = []
  for (const log of logs) {
    if (!byEx[log.exerciseId]) {
      byEx[log.exerciseId] = { name: log.exerciseName, count: 0 }
      order.push(log.exerciseId)
    }
    byEx[log.exerciseId].count++
  }
  return order.map(id => byEx[id])
}

// 点击日期卡进入明细（仅限有训练的日期，纯有氧日无明细页）
function goDetail(date) {
  router.push('/history/' + date)
}

// ?date= / 日历选日定位高亮
const highlightDate = ref('')
const dateEls = {}
function setDateEl(el) {
  if (el) dateEls[el.dataset.date] = el
}
function scrollToDate(dateStr) {
  highlightDate.value = dateStr
  setTimeout(() => {
    const el = dateEls[dateStr]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 120)
}
function onCalendarSelect(dateStr) {
  if (mergedDates.value.includes(dateStr)) scrollToDate(dateStr)
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function dayTypeLabel(logs) {
  const types = [...new Set(logs.map(l => l.dayType))]
  if (types.length === 0) return ''
  const p = SEED_WORKOUT_PLAN.find(day => day.dayType === types[0])
  return p ? p.label.split(' ')[0] : types[0]
}

// 日期卡日型 chip：有训练用执行日型；纯有氧日没有训练日志，退回计划日型（休/推/拉/腿），与日历口径一致
function dayChip(date) {
  const logs = historyByDate.value[date]
  if (logs && logs.length) return dayTypeLabel(logs)
  const t = training.getDayTypeForDate(date)
  const p = SEED_WORKOUT_PLAN.find(day => day.dayType === t)
  return p ? p.label.split(' ')[0] : (t || '')
}

// 有氧行：类型标签与主指标（自 AerobicView 迁入，只此一处消费，不进 store）
function typeLabel(type) {
  return { swim: '游泳', stair: '爬楼机', treadmill: '跑步机', bike: '动感单车' }[type] || '有氧'
}
function mainMetric(l) {
  if (l.type === 'stair') return `${l.distanceKm} km`
  if (l.type === 'treadmill') return `${l.distanceKm} km`
  if (l.type === 'bike') return `${l.distanceKm} km`
  return `${(l.distanceM / 1000).toFixed(2)} km`
}

// 删除有氧：与原有氧页删除语义逐字一致（原生 confirm）；store 删除后自重载，
// 时间线/累计卡/日历标记全部联动刷新
async function removeAerobic(id) {
  if (confirm('删除这条记录？')) {
    await aerobic.deleteLog(id)
  }
}

onMounted(async () => {
  // 确保日历能读取 DB 中的计划偏移（避免先用默认值渲染后跳动）
  if (!training.scheduleLoaded) await training.init()
  await Promise.all([training.loadHistory(), aerobic.load()])
  // 从今日页跳转过来：定位并高亮对应日期
  const d = route.query.date
  if (d && mergedDates.value.includes(d)) {
    scrollToDate(d)
  }
})
</script>

<style scoped>
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.history-list {
  padding: 0 16px;
}
.history-card {
  padding: 14px 16px;
  cursor: pointer;
  position: relative;
  transition: border-color 0.2s var(--easing), box-shadow 0.2s var(--easing);
}
.history-card:active {
  border-color: var(--accent);
}
/* 纯有氧日不可下钻，指针还原 */
.history-card.aerobic-only {
  cursor: default;
}
.history-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}
.history-date {
  font-size: 14px;
  font-weight: 600;
}
.history-daytype {
  font-size: 11px;
  background: var(--accent-dim);
  color: var(--accent-strong);
  padding: 2px 10px;
  border-radius: 20px;
}
.history-sets {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}
.history-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  font-size: 13px;
}
.summary-item {
  color: var(--text-secondary);
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.summary-item b {
  color: var(--accent-strong);
  font-weight: 600;
}
/* 下钻箭头随日期行内联：有氧行的删除按钮占了卡片右下角，绝对定位箭头会压上去 */
.history-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.history-card.highlighted {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 12px var(--accent-glow);
}

/* 有氧累计卡（统计跟记录走） */
.aero-stats {
  margin: 0 16px 12px;
}
.aero-stats-grid {
  display: flex;
  gap: 10px;
}
.aero-stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.aero-stat-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}
.aero-stat-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 有氧行（自 AerobicView 迁入） */
.aerobic-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.aerobic-row:last-child {
  border-bottom: none;
}
.aerobic-main {
  font-weight: 600;
}
.aerobic-sub {
  color: var(--text-secondary);
}
.aerobic-tag {
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 20px;
}
.aerobic-type {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.aerobic-type.type-swim {
  background: var(--accent-dim);
  color: var(--accent-strong);
}
.aerobic-type.type-stair {
  background: rgba(56, 189, 248, 0.15);
  color: var(--type-pull);
}
.aerobic-type.type-treadmill {
  background: rgba(167, 139, 250, 0.16);
  color: var(--type-legs);
}
.aerobic-type.type-bike {
  background: rgba(248, 113, 113, 0.15);
  color: var(--type-push);
}
.del-btn {
  margin-left: auto;
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  transition: color 0.2s, background 0.2s;
}
.del-btn:active {
  color: var(--danger);
  background: var(--danger-dim);
}
</style>

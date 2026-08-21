<template>
  <div class="history-view">
    <div class="page-header history-header">
      <div>
        <h1>训练记录</h1>
        <div class="subtitle">共 {{ totalDays }} 天训练 · {{ totalSets }} 组</div>
      </div>
      <button class="btn btn-primary ai-btn" @click="aiOpen = true">
        <AppIcon name="sparkles" :size="16" />
        <span>AI 咨询</span>
      </button>
    </div>

    <!-- 训练日历：标注计划类型 + 是否如期训练，长按顺延 -->
    <CalendarCard @select-date="onCalendarSelect" />

    <!-- 历史记录列表（按日期倒序）：只显示概要，点击进入该日明细 -->
    <div class="history-list">
      <div v-for="(date) in sortedDates" :key="date" class="card history-card"
           :class="{ highlighted: highlightDate === date }"
           :data-date="date" :ref="setDateEl" @click="goDetail(date)">
        <div class="history-date-row">
          <span class="history-date">{{ formatDate(date) }}</span>
          <span class="history-daytype">{{ dayTypeLabel(historyByDate[date]) }}</span>
          <span class="history-sets num">{{ historyByDate[date].length }} 组</span>
        </div>
        <div class="history-summary">
          <span v-for="s in dateSummary(date)" :key="s.name" class="summary-item">
            {{ s.name }} <b class="num">{{ s.count }}组</b>
          </span>
        </div>
        <AppIcon class="history-arrow" name="chevron-right" :size="16" />
      </div>
    </div>

    <div v-if="sortedDates.length === 0" class="empty-state">
      <AppIcon name="chart" :size="44" style="color: var(--text-tertiary)" />
      <div style="margin-top:12px">还没有训练记录，去开始第一次训练吧！</div>
    </div>

    <!-- AI 咨询下穿面板 -->
    <AiPanel v-if="aiOpen" @close="aiOpen = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '../stores/training'
import { SEED_WORKOUT_PLAN } from '../database/seed'
import AppIcon from '../components/AppIcon.vue'
import CalendarCard from '../components/CalendarCard.vue'
import AiPanel from '../components/AiPanel.vue'

const route = useRoute()
const router = useRouter()
const training = useTrainingStore()
const aiOpen = ref(false)

const historyByDate = computed(() => training.historyByDate)
const sortedDates = computed(() => Object.keys(historyByDate.value).sort().reverse())

const totalDays = computed(() => sortedDates.value.length)
const totalSets = computed(() => sortedDates.value.reduce((s, d) => s + historyByDate.value[d].length, 0))

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

// 点击日期卡进入明细
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
  if (historyByDate.value[dateStr]) scrollToDate(dateStr)
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

onMounted(async () => {
  // 确保日历能读取 DB 中的计划偏移（避免先用默认值渲染后跳动）
  if (!training.scheduleLoaded) await training.init()
  await training.loadHistory()
  // 从今日页跳转过来：定位并高亮对应日期
  const d = route.query.date
  if (d && historyByDate.value[d]) {
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
.ai-btn {
  font-size: 13px;
  padding: 8px 14px;
  flex-shrink: 0;
  min-height: 40px;
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
  padding-right: 24px; /* 给右下角箭头留位 */
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
.history-arrow {
  position: absolute;
  right: 12px;
  bottom: 12px;
  color: var(--text-tertiary);
}
.history-card.highlighted {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 12px var(--accent-glow);
}
</style>

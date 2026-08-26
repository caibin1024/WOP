<template>
  <div class="aerobic-view">
    <div class="page-header">
      <h1>有氧日志</h1>
      <div class="subtitle">有氧恢复 · 每天打卡</div>
    </div>

    <!-- 子模块页签：游泳 | 爬楼机 | 跑步机 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'swim' }" @click="activeTab = 'swim'">游泳</button>
      <button class="tab-btn" :class="{ active: activeTab === 'stair' }" @click="activeTab = 'stair'">爬楼机</button>
      <button class="tab-btn" :class="{ active: activeTab === 'treadmill' }" @click="activeTab = 'treadmill'">跑步机</button>
    </div>

    <!-- ===== 游泳子模块 ===== -->
    <template v-if="activeTab === 'swim'">
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-value num">{{ (aerobic.swimTotalDistance / 1000).toFixed(1) }}<span class="stat-unit">km</span></div>
          <div class="stat-label">累计距离</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ aerobic.swimTotalSessions }}<span class="stat-unit">次</span></div>
          <div class="stat-label">游泳次数</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ avgPace }}<span class="stat-unit">分/km</span></div>
          <div class="stat-label">平均配速</div>
        </div>
      </div>

      <div class="card form-card">
        <div class="card-title">记录游泳</div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="swimForm.date" class="form-input">
        </div>
        <div class="form-row">
          <label>距离(米)</label>
          <input type="number" inputmode="numeric" v-model.number="swimForm.distanceM"
                 placeholder="如 1000" class="form-input">
        </div>
        <div class="form-row">
          <label>时长(分钟)</label>
          <input type="number" inputmode="numeric" v-model.number="swimForm.durationMin"
                 placeholder="如 60" class="form-input">
        </div>
        <div class="form-row">
          <label>力量后游？</label>
          <label class="switch">
            <input type="checkbox" v-model="swimForm.afterStrength">
            <span class="switch-slider"></span>
          </label>
        </div>
        <button class="btn btn-primary form-btn" @click="save" :disabled="!swimForm.distanceM">保存记录</button>
      </div>

      <div class="card tip-card">
        <div class="card-title">今日建议</div>
        <div class="tip-text">{{ swimTip }}</div>
      </div>
    </template>

    <!-- ===== 爬楼机子模块 ===== -->
    <template v-else-if="activeTab === 'stair'">
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-value num">{{ aerobic.stairTotalFloors }}<span class="stat-unit">层</span></div>
          <div class="stat-label">累计层数</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ aerobic.stairTotalSessions }}<span class="stat-unit">次</span></div>
          <div class="stat-label">爬楼次数</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ avgStairDuration }}<span class="stat-unit">分/次</span></div>
          <div class="stat-label">平均时长</div>
        </div>
      </div>

      <div class="card form-card">
        <div class="card-title">记录爬楼机</div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="stairForm.date" class="form-input">
        </div>
        <div class="form-row">
          <label>层数</label>
          <input type="number" inputmode="numeric" v-model.number="stairForm.floors"
                 placeholder="如 50" class="form-input">
        </div>
        <div class="form-row">
          <label>时长(分钟)</label>
          <input type="number" inputmode="numeric" v-model.number="stairForm.durationMin"
                 placeholder="如 30" class="form-input">
        </div>
        <div class="form-row">
          <label>力量后练？</label>
          <label class="switch">
            <input type="checkbox" v-model="stairForm.afterStrength">
            <span class="switch-slider"></span>
          </label>
        </div>
        <button class="btn btn-primary form-btn" @click="save" :disabled="!stairForm.floors">保存记录</button>
      </div>

      <div class="card tip-card">
        <div class="card-title">今日建议</div>
        <div class="tip-text">{{ stairTip }}</div>
      </div>
    </template>

    <!-- ===== 跑步机子模块 ===== -->
    <template v-else>
      <div class="stats-row">
        <div class="stat-card card">
          <div class="stat-value num">{{ aerobic.treadmillTotalDistance.toFixed(1) }}<span class="stat-unit">km</span></div>
          <div class="stat-label">累计距离</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ aerobic.treadmillTotalSessions }}<span class="stat-unit">次</span></div>
          <div class="stat-label">跑步次数</div>
        </div>
        <div class="stat-card card">
          <div class="stat-value num">{{ avgTreadmillDuration }}<span class="stat-unit">分/次</span></div>
          <div class="stat-label">平均时长</div>
        </div>
      </div>

      <div class="card form-card">
        <div class="card-title">记录跑步机</div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="treadmillForm.date" class="form-input">
        </div>
        <div class="form-row">
          <label>距离(km)</label>
          <input type="number" inputmode="decimal" v-model.number="treadmillForm.distanceKm"
                 placeholder="如 3.5" class="form-input">
        </div>
        <div class="form-row">
          <label>时长(分钟)</label>
          <input type="number" inputmode="numeric" v-model.number="treadmillForm.durationMin"
                 placeholder="如 30" class="form-input">
        </div>
        <div class="form-row">
          <label>力量后练？</label>
          <label class="switch">
            <input type="checkbox" v-model="treadmillForm.afterStrength">
            <span class="switch-slider"></span>
          </label>
        </div>
        <button class="btn btn-primary form-btn" @click="save" :disabled="!treadmillForm.distanceKm">保存记录</button>
      </div>

      <div class="card tip-card">
        <div class="card-title">今日建议</div>
        <div class="tip-text">{{ treadmillTip }}</div>
      </div>
    </template>

    <!-- ===== 统一有氧记录列表（三种类型合并，行内标记类型） ===== -->
    <div class="card">
      <div class="card-title">有氧记录</div>
      <div v-for="l in aerobic.logs" :key="l.id" class="aerobic-row">
        <span class="aerobic-type" :class="'type-' + l.type">{{ typeLabel(l.type) }}</span>
        <span class="aerobic-date">{{ formatDate(l.date) }}</span>
        <span class="aerobic-main num">{{ mainMetric(l) }}</span>
        <span class="aerobic-sub num">{{ l.durationMin }}分</span>
        <span v-if="l.afterStrength" class="aerobic-tag">力量后</span>
        <button class="del-btn" @click="remove(l.id)" aria-label="删除">
          <AppIcon name="trash" :size="16" />
        </button>
      </div>
      <div v-if="aerobic.logs.length === 0" class="empty-state">
        <AppIcon name="waves" :size="44" style="color: var(--text-tertiary)" />
        <div style="margin-top:12px">暂无有氧记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAerobicStore } from '../stores/aerobic'
import AppIcon from '../components/AppIcon.vue'

const aerobic = useAerobicStore()

// 当前子模块页签：'swim' 游泳 | 'stair' 爬楼机 | 'treadmill' 跑步机
const activeTab = ref('swim')

const swimForm = reactive({
  date: todayLocal(),
  distanceM: 1000, // 默认 1000m（通常泳距不变）
  durationMin: null,
  afterStrength: false
})

const stairForm = reactive({
  date: todayLocal(),
  floors: null,
  durationMin: null,
  afterStrength: false
})

const treadmillForm = reactive({
  date: todayLocal(),
  distanceKm: null,
  durationMin: null,
  afterStrength: false
})

// 游泳：平均配速（分/km）
const avgPace = computed(() => {
  const totalMin = aerobic.swimLogs.reduce((s, l) => s + (l.durationMin || 0), 0)
  const totalKm = aerobic.swimTotalDistance / 1000
  if (totalKm === 0) return '--'
  const pace = totalMin / totalKm
  return Math.round(pace * 10) / 10
})

// 爬楼机：平均时长（分/次）
const avgStairDuration = computed(() => {
  const totalMin = aerobic.stairLogs.reduce((s, l) => s + (l.durationMin || 0), 0)
  const n = aerobic.stairTotalSessions
  if (n === 0) return '--'
  return Math.round((totalMin / n) * 10) / 10
})

// 跑步机：平均时长（分/次）
const avgTreadmillDuration = computed(() => {
  const totalMin = aerobic.treadmillLogs.reduce((s, l) => s + (l.durationMin || 0), 0)
  const n = aerobic.treadmillTotalSessions
  if (n === 0) return '--'
  return Math.round((totalMin / n) * 10) / 10
})

// 统一记录列表：类型标签与主指标
function typeLabel(type) {
  return { swim: '游泳', stair: '爬楼机', treadmill: '跑步机' }[type] || '有氧'
}
function mainMetric(l) {
  if (l.type === 'stair') return `${l.floors} 层`
  if (l.type === 'treadmill') return `${l.distanceKm} km`
  return `${(l.distanceM / 1000).toFixed(2)} km`
}

const swimTip = computed(() => {
  const day = new Date().getDay()
  if (day === 0 || day === 3 || day === 6) {
    return '今天是力量训练日，游泳建议轻松游，注意腿部训练后防抽筋。'
  }
  return '今天是休息/游泳日，保持1km，可以稍微自由放松游。'
})

const stairTip = computed(() => {
  const day = new Date().getDay()
  if (day === 0 || day === 3 || day === 6) {
    return '今天是力量训练日，爬楼机建议中低强度 20-30 分钟，注意膝盖。'
  }
  return '今天是休息/有氧日，可爬 30-40 分钟，节奏保持稳定。'
})

const treadmillTip = computed(() => {
  const day = new Date().getDay()
  if (day === 0 || day === 3 || day === 6) {
    return '今天是力量训练日，跑步机建议中低强度 20-30 分钟，速度平缓即可。'
  }
  return '今天是休息/有氧日，可快走或慢跑 30-40 分钟，心率保持在舒适区间。'
})

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}.${m}.${d}`
}

async function save() {
  if (activeTab.value === 'swim') {
    if (!swimForm.distanceM) return
    await aerobic.addLog({
      type: 'swim',
      date: swimForm.date || todayLocal(),
      distanceM: Number(swimForm.distanceM),
      durationMin: Number(swimForm.durationMin) || 60,
      afterStrength: swimForm.afterStrength,
      notes: ''
    })
    swimForm.distanceM = null
    swimForm.durationMin = null
    swimForm.afterStrength = false
  } else if (activeTab.value === 'stair') {
    if (!stairForm.floors) return
    await aerobic.addLog({
      type: 'stair',
      date: stairForm.date || todayLocal(),
      floors: Number(stairForm.floors),
      durationMin: Number(stairForm.durationMin) || 30,
      afterStrength: stairForm.afterStrength,
      notes: ''
    })
    stairForm.floors = null
    stairForm.durationMin = null
    stairForm.afterStrength = false
  } else {
    if (!treadmillForm.distanceKm) return
    await aerobic.addLog({
      type: 'treadmill',
      date: treadmillForm.date || todayLocal(),
      distanceKm: Number(treadmillForm.distanceKm),
      durationMin: Number(treadmillForm.durationMin) || 30,
      afterStrength: treadmillForm.afterStrength,
      notes: ''
    })
    treadmillForm.distanceKm = null
    treadmillForm.durationMin = null
    treadmillForm.afterStrength = false
  }
  alert('已保存')
}

async function remove(id) {
  if (confirm('删除这条记录？')) {
    await aerobic.deleteLog(id)
  }
}

onMounted(() => {
  aerobic.load()
})
</script>

<style scoped>
.tab-bar {
  display: flex;
  gap: 8px;
  padding: 10px 16px 12px;
}
.tab-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.tab-btn.active {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent-strong);
}
.stats-row {
  display: flex;
  gap: 10px;
  padding: 0 16px 12px;
}
.stat-card {
  flex: 1;
  text-align: center;
  padding: 16px 8px;
  margin-bottom: 0;
  background: linear-gradient(160deg, var(--surface), var(--surface-hover));
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent-strong);
}
.stat-unit {
  font-size: 11px;
  margin-left: 2px;
  color: var(--text-secondary);
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.form-card {
  margin: 0 16px 12px;
}
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.form-row label {
  width: 90px;
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.form-input {
  flex: 1;
}
.form-input::-webkit-calendar-picker-indicator {
  filter: invert(0.7);
}
.form-btn {
  width: 100%;
  margin-top: 4px;
}
.switch {
  position: relative;
  width: 46px;
  height: 28px;
  display: inline-block;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-slider {
  position: absolute;
  inset: 0;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 14px;
  transition: all 0.2s var(--easing);
  cursor: pointer;
}
.switch-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: all 0.2s var(--easing);
}
.switch input:checked + .switch-slider {
  background: var(--accent-dim);
  border-color: var(--accent);
}
.switch input:checked + .switch-slider::before {
  transform: translateX(18px);
  background: var(--accent);
}
.tip-card {
  margin: 0 16px 12px;
  border-color: rgba(249, 115, 22, 0.2);
}
.tip-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}
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

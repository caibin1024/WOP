<template>
  <div class="body-view">
    <div class="page-header body-header">
      <div>
        <h1>个人</h1>
        <div class="subtitle">体重 · BMI 追踪</div>
      </div>
      <button class="gear-btn" @click="goSettings" aria-label="设置">
        <AppIcon name="settings" :size="20" />
      </button>
    </div>

    <!-- 当前状态 -->
    <div class="stats-row" v-if="body.latest">
      <div class="stat-card card">
        <div class="stat-value num">{{ body.latest.weightKg }}<span class="stat-unit">kg</span></div>
        <div class="stat-label">当前体重</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value num">{{ body.latestBmi }}<span class="stat-unit">BMI</span></div>
        <div class="stat-label" :style="{ color: bmiColor }">{{ bmiText }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-value num">{{ recordsCount }}<span class="stat-unit">次</span></div>
        <div class="stat-label">记录次数</div>
      </div>
    </div>

    <!-- 录入表单 -->
    <div class="card form-card">
      <div class="card-title">记录体重</div>
      <div class="form-row">
        <label>日期</label>
        <input type="date" v-model="form.date" class="form-input">
      </div>
      <div class="form-row">
        <label>体重(kg)</label>
        <input type="number" inputmode="decimal" step="0.1" v-model.number="form.weightKg"
               placeholder="如 71.5" class="form-input">
      </div>
      <div class="form-row">
        <label>备注</label>
        <input type="text" v-model="form.notes" placeholder="可选" class="form-input">
      </div>
      <button class="btn btn-primary form-btn" @click="save" :disabled="!form.weightKg">保存记录</button>
    </div>

    <!-- 体重趋势图 -->
    <div class="card">
      <div class="card-title">体重趋势</div>
      <ProgressChart :data="chartData" unit="kg" />
    </div>

    <!-- 历史记录列表 -->
    <div class="card">
      <div class="card-title">历史记录</div>
      <div v-for="r in body.records" :key="r.id" class="body-record-row">
        <span>{{ formatDate(r.date) }}</span>
        <span class="record-weight num">{{ r.weightKg }} kg</span>
        <span class="record-bmi num">BMI {{ r.bmi }}</span>
        <button class="del-btn" @click="remove(r.id)" aria-label="删除">
          <AppIcon name="trash" :size="16" />
        </button>
      </div>
      <div v-if="body.records.length === 0" class="empty-state">
        <AppIcon name="scale" :size="44" style="color: var(--text-tertiary)" />
        <div style="margin-top:12px">暂无记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBodyStore } from '../stores/body'
import ProgressChart from '../components/ProgressChart.vue'
import AppIcon from '../components/AppIcon.vue'

const router = useRouter()
const body = useBodyStore()

function goSettings() {
  router.push('/settings')
}

const form = reactive({
  date: todayLocal(),
  weightKg: null,
  notes: ''
})

const recordsCount = computed(() => body.records.length)

const chartData = computed(() => {
  return [...body.records].reverse().map(r => ({
    date: r.date,
    max_weight: r.weightKg
  }))
})

const bmiText = computed(() => {
  const b = body.latestBmi
  if (b === null) return ''
  if (b < 18.5) return '偏瘦'
  if (b < 24) return '正常'
  if (b < 28) return '超重'
  return '肥胖'
})
const bmiColor = computed(() => {
  const b = body.latestBmi
  if (b === null) return 'var(--text-secondary)'
  if (b < 18.5) return 'var(--warning)'
  if (b < 24) return 'var(--success)'
  if (b < 28) return 'var(--warning)'
  return 'var(--danger)'
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
  if (!form.weightKg) return
  await body.saveRecord({
    date: form.date || todayLocal(),
    weightKg: Number(form.weightKg),
    notes: form.notes
  })
  form.weightKg = null
  form.notes = ''
  alert('已保存')
}

async function remove(id) {
  if (confirm('删除这条记录？')) {
    await body.deleteRecord(id)
  }
}

onMounted(() => {
  body.load()
})
</script>

<style scoped>
.body-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.gear-btn {
  background: none;
  border: none;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}
.gear-btn:active {
  color: var(--accent);
  background: var(--accent-dim);
}
.stats-row {
  display: flex;
  gap: 10px;
  padding: 10px 16px 12px;
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
  width: 80px;
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
.body-record-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}
.body-record-row:last-child {
  border-bottom: none;
}
.record-weight {
  font-weight: 600;
}
.record-bmi {
  color: var(--text-secondary);
  font-size: 12px;
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

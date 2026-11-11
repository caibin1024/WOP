<template>
  <div class="aerobic-view">
    <div class="page-header">
      <h1>有氧</h1>
      <div class="subtitle">有氧恢复 · 每天打卡</div>
    </div>

    <!-- 子模块页签：游泳 | 爬楼机 | 跑步机 | 动感单车 -->
    <div class="tab-bar">
      <button class="tab-btn" :class="{ active: activeTab === 'swim' }" @click="activeTab = 'swim'">游泳</button>
      <button class="tab-btn" :class="{ active: activeTab === 'stair' }" @click="activeTab = 'stair'">爬楼机</button>
      <button class="tab-btn" :class="{ active: activeTab === 'treadmill' }" @click="activeTab = 'treadmill'">跑步机</button>
      <button class="tab-btn" :class="{ active: activeTab === 'bike' }" @click="activeTab = 'bike'">动感单车</button>
    </div>

    <!-- ===== 游泳子模块 ===== -->
    <template v-if="activeTab === 'swim'">
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
      <div class="card form-card">
        <div class="card-title">记录爬楼机</div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="stairForm.date" class="form-input">
        </div>
        <div class="form-row">
          <label>距离(km)</label>
          <input type="number" inputmode="decimal" v-model.number="stairForm.distanceKm"
                 placeholder="如 2.5" class="form-input">
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
        <button class="btn btn-primary form-btn" @click="save" :disabled="!stairForm.distanceKm">保存记录</button>
      </div>

      <div class="card tip-card">
        <div class="card-title">今日建议</div>
        <div class="tip-text">{{ stairTip }}</div>
      </div>
    </template>

    <!-- ===== 跑步机子模块 ===== -->
    <template v-else-if="activeTab === 'treadmill'">
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

    <!-- ===== 动感单车子模块 ===== -->
    <template v-else>
      <div class="card form-card">
        <div class="card-title">记录动感单车</div>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="bikeForm.date" class="form-input">
        </div>
        <div class="form-row">
          <label>距离(km)</label>
          <input type="number" inputmode="decimal" v-model.number="bikeForm.distanceKm"
                 placeholder="如 10" class="form-input">
        </div>
        <div class="form-row">
          <label>时长(分钟)</label>
          <input type="number" inputmode="numeric" v-model.number="bikeForm.durationMin"
                 placeholder="如 40" class="form-input">
        </div>
        <div class="form-row">
          <label>力量后练？</label>
          <label class="switch">
            <input type="checkbox" v-model="bikeForm.afterStrength">
            <span class="switch-slider"></span>
          </label>
        </div>
        <button class="btn btn-primary form-btn" @click="save" :disabled="!bikeForm.distanceKm">保存记录</button>
      </div>

      <div class="card tip-card">
        <div class="card-title">今日建议</div>
        <div class="tip-text">{{ bikeTip }}</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAerobicStore } from '../stores/aerobic'

// 本页只做录入（历史与累计统计在「记录」页）；save() 落库后 store 自重载，记录页跟着刷新
const aerobic = useAerobicStore()

// 当前子模块页签：'swim' 游泳 | 'stair' 爬楼机 | 'treadmill' 跑步机 | 'bike' 动感单车
const activeTab = ref('swim')

const swimForm = reactive({
  date: todayLocal(),
  distanceM: 1000, // 默认 1000m（通常泳距不变）
  durationMin: null,
  afterStrength: false
})

const stairForm = reactive({
  date: todayLocal(),
  distanceKm: null,
  durationMin: null,
  afterStrength: false
})

const treadmillForm = reactive({
  date: todayLocal(),
  distanceKm: null,
  durationMin: null,
  afterStrength: false
})

const bikeForm = reactive({
  date: todayLocal(),
  distanceKm: null,
  durationMin: null,
  afterStrength: false
})

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

const bikeTip = computed(() => {
  const day = new Date().getDay()
  if (day === 0 || day === 3 || day === 6) {
    return '今天是力量训练日，动感单车建议中低强度 25-35 分钟，保持稳定踏频。'
  }
  return '今天是休息/有氧日，可骑 30-45 分钟，档位适中，保持呼吸节奏。'
})

function todayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
    if (!stairForm.distanceKm) return
    await aerobic.addLog({
      type: 'stair',
      date: stairForm.date || todayLocal(),
      distanceKm: Number(stairForm.distanceKm),
      durationMin: Number(stairForm.durationMin) || 30,
      afterStrength: stairForm.afterStrength,
      notes: ''
    })
    stairForm.distanceKm = null
    stairForm.durationMin = null
    stairForm.afterStrength = false
  } else if (activeTab.value === 'treadmill') {
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
  } else {
    if (!bikeForm.distanceKm) return
    await aerobic.addLog({
      type: 'bike',
      date: bikeForm.date || todayLocal(),
      distanceKm: Number(bikeForm.distanceKm),
      durationMin: Number(bikeForm.durationMin) || 30,
      afterStrength: bikeForm.afterStrength,
      notes: ''
    })
    bikeForm.distanceKm = null
    bikeForm.durationMin = null
    bikeForm.afterStrength = false
  }
  alert('已保存')
}
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
</style>

<template>
  <div class="chart-wrap" v-if="points.length > 1">
    <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg">
      <!-- 网格线 -->
      <line v-for="gy in gridY" :key="'gy' + gy" :x1="PAD_L" :y1="gy" :x2="W - PAD_R" :y2="gy" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="3 3" />
      <!-- Y轴标签 -->
      <text v-for="gy in gridY" :key="'yt' + gy" :x="PAD_L - 6" :y="gy + 4" text-anchor="end" class="axis-label" :fill="'var(--text-secondary)'">{{ yLabelFor(gy) }}</text>
      <!-- 面积填充 -->
      <polygon :points="areaPoints" fill="var(--accent)" opacity="0.12" />
      <!-- 折线 -->
      <polyline :points="linePoints" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <!-- 数据点 -->
      <circle v-for="(p, i) in pts" :key="i" :cx="p.x" :cy="p.y" r="3.5" fill="var(--accent)" stroke="var(--bg-base)" stroke-width="1.5" />
    </svg>
    <!-- X轴日期标签 -->
    <div class="chart-xlabels">
      <span v-for="(l, i) in xLabels" :key="i">{{ l }}</span>
    </div>
  </div>
  <div v-else class="chart-empty">暂无足够数据，开始训练后显示进度</div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // [{ date: '2026-08-11', max_weight: 12.5 }]
  data: { type: Array, default: () => [] },
  unit: { type: String, default: 'kg' }
})

const W = 320
const H = 140
const PAD_L = 40
const PAD_R = 12
const PAD_T = 12
const PAD_B = 8

const pts = computed(() => {
  const d = props.data.slice(-10) // 最多显示最近10次
  const maxVal = Math.max(...d.map(p => p.max_weight)) || 1
  const minVal = Math.min(...d.map(p => p.max_weight)) || 0
  const range = maxVal - minVal || 1
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  return d.map((p, i) => ({
    x: PAD_L + (d.length === 1 ? innerW / 2 : (i / (d.length - 1)) * innerW),
    y: PAD_T + innerH - ((p.max_weight - minVal) / range) * innerH,
    value: p.max_weight
  }))
})

const linePoints = computed(() => pts.value.map(p => `${p.x},${p.y}`).join(' '))
const areaPoints = computed(() => {
  if (pts.value.length === 0) return ''
  const last = pts.value[pts.value.length - 1]
  const first = pts.value[0]
  return `${first.x},${H - PAD_B} ${linePoints.value} ${last.x},${H - PAD_B}`
})

// 网格线（3条水平线）
const gridY = computed(() => {
  const innerH = H - PAD_T - PAD_B
  return [0, 1, 2].map(i => PAD_T + (i / 2) * innerH)
})

const maxLabel = computed(() => Math.max(...props.data.map(p => p.max_weight)) || 0)
const minLabel = computed(() => Math.min(...props.data.map(p => p.max_weight)) || 0)

function yLabelFor(y) {
  const innerH = H - PAD_T - PAD_B
  const ratio = 1 - (y - PAD_T) / innerH
  const val = Math.round((minLabel.value + ratio * (maxLabel.value - minLabel.value)) * 10) / 10
  return val + (props.unit || '')
}

const xLabels = computed(() => {
  const d = props.data.slice(-10)
  return d.map(p => p.date.slice(5)) // MM-DD
})
</script>

<style scoped>
.chart-wrap {
  width: 100%;
}
.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}
.axis-label {
  font-size: 9px;
}
.chart-xlabels {
  display: flex;
  justify-content: space-between;
  padding: 0 10px 0 40px;
  font-size: 9px;
  color: var(--text-secondary);
}
.chart-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 32px 0;
}
</style>

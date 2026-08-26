<template>
  <div class="history-detail-view">
    <!-- 返回 -->
    <div class="detail-topbar">
      <button class="back-btn" @click="goBack">
        <AppIcon class="back-icon" name="arrow-right" :size="18" />
        <span>返回训练记录</span>
      </button>
    </div>

    <!-- 标题区 -->
    <div v-if="groups.length" class="detail-header card">
      <div class="detail-date">{{ formatDate(date) }}</div>
      <div class="detail-meta">
        <span class="tag-daytype">{{ dayTypeLabel }}</span>
        <span class="detail-sets">{{ totalSets }} 组</span>
      </div>
    </div>

    <!-- 按动作分组的明细 -->
    <div v-if="groups.length" class="detail-list">
      <div v-for="g in groups" :key="g.exerciseId" class="card ex-card">
        <div class="ex-head">
          <span class="ex-name">{{ g.name }}</span>
          <div class="ex-head-actions">
            <span class="ex-tag" :class="findExercise(g.exerciseId)?.isMachine ? 'machine' : 'free'">
              {{ findExercise(g.exerciseId)?.isMachine ? '器械' : '自由' }}
            </span>
            <button class="ex-swap" @click="openSwapPicker(g)" aria-label="更换动作">
              <AppIcon name="exchange" :size="15" />
            </button>
          </div>
        </div>
        <div class="ex-sets">
          <div v-for="log in g.logs" :key="log.id" class="set-row">
            <!-- 内联编辑态 -->
            <template v-if="isEditing(log)">
              <div class="set-detail">
                <span class="set-num">第{{ log.setNumber }}组</span>
                <div class="edit-row">
                  <template v-if="isTimedLog(log)">
                    <input type="number" inputmode="numeric" class="edit-input" v-model.number="editValue" placeholder="秒数">
                    <span class="edit-unit">秒</span>
                  </template>
                  <template v-else>
                    <input type="number" inputmode="decimal" class="edit-input" v-model.number="editWeight" placeholder="重量">
                    <span class="edit-unit">kg</span>
                    <span class="edit-times">×</span>
                    <input type="number" inputmode="numeric" class="edit-input" v-model.number="editReps" placeholder="次数">
                    <span class="edit-unit">次</span>
                  </template>
                  <button class="edit-btn save" @click="saveEdit(log)">保存</button>
                  <button class="edit-btn" @click="cancelEdit">取消</button>
                </div>
              </div>
            </template>
            <!-- 展示态 -->
            <template v-else>
              <div class="set-detail">
                <span class="set-num">第{{ log.setNumber }}组</span>
                <span class="set-value" :class="{ done: log.done }">
                  <AppIcon v-if="log.done" name="check" :size="14" style="color: var(--success)" />
                  {{ displayLog(log) }}
                </span>
              </div>
              <div class="set-actions">
                <button class="act-btn" @click="startEdit(log)" aria-label="编辑">
                  <AppIcon name="pencil" :size="16" />
                </button>
                <button v-if="deleteArmId !== log.id" class="act-btn danger" @click="deleteArmId = log.id" aria-label="删除">
                  <AppIcon name="trash" :size="16" />
                </button>
                <button v-else class="act-btn armed" @click="confirmDelete(log.id)">确认删除</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-else class="empty-state">
      <AppIcon name="chart" :size="44" style="color: var(--text-tertiary)" />
      <div style="margin-top:12px">{{ date ? '这一天没有训练记录' : '未找到该日期的记录' }}</div>
      <button class="btn btn-primary" style="margin-top:16px" @click="goBack">返回训练记录</button>
    </div>

    <!-- 更换动作选择面板 -->
    <ExercisePickerSheet
      v-if="swapPicker"
      title="更换动作"
      :day-label="dayTypeLabel"
      :exercises="training.allExercises"
      :used-ids="swapUsedIds"
      @select="onSwapSelect"
      @close="swapPicker = null"
    />

    <!-- 浮层/内联态纳入返回键：换动作面板、删除确认、内联编辑 -->
    <BackLayer :show="!!swapPicker" @back="swapPicker = null" />
    <BackLayer :show="!!deleteArmId" @back="deleteArmId = ''" />
    <BackLayer :show="editingId !== ''" @back="cancelEdit" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '../stores/training'
import { SEED_WORKOUT_PLAN } from '../database/seed'
import AppIcon from '../components/AppIcon.vue'
import ExercisePickerSheet from '../components/ExercisePickerSheet.vue'
import BackLayer from '../components/BackLayer.vue'

const route = useRoute()
const router = useRouter()
const training = useTrainingStore()

const date = computed(() => String(route.params.date || ''))

// 按动作分组（保持首次出现顺序），组内按组号排序
const groups = computed(() => {
  const logs = [...(training.historyByDate[date.value] || [])]
  const byEx = {}
  const order = []
  for (const log of logs) {
    if (!byEx[log.exerciseId]) {
      byEx[log.exerciseId] = []
      order.push(log.exerciseId)
    }
    byEx[log.exerciseId].push(log)
  }
  return order.map(id => ({
    exerciseId: id,
    name: byEx[id][0].exerciseName,
    logs: byEx[id].slice().sort((a, b) => a.setNumber - b.setNumber)
  }))
})

const totalSets = computed(() => groups.value.reduce((s, g) => s + g.logs.length, 0))

const dayTypeLabel = computed(() => {
  const first = groups.value[0]?.logs[0]
  if (!first) return ''
  const p = SEED_WORKOUT_PLAN.find(day => day.dayType === first.dayType)
  return p ? p.label.split(' ')[0] : first.dayType
})

function findExercise(exId) {
  return training.allExercises.find(e => e.id === exId)
}
function isTimedLog(log) {
  return findExercise(log.exerciseId)?.special === 'seconds'
}

// 强度文案：计时动作「46 秒」；有重量「10kg × 12」；自重「12 次」
function displayLog(log) {
  if (isTimedLog(log)) return `${log.reps} 秒`
  if (log.weightKg > 0) return `${log.weightKg}kg × ${log.reps}`
  return `${log.reps} 次`
}

// 内联编辑
const editingId = ref('')
const editWeight = ref(null)
const editReps = ref(null)
const editValue = ref(null)
function isEditing(log) { return editingId.value === log.id }
function startEdit(log) {
  editingId.value = log.id
  if (isTimedLog(log)) {
    editValue.value = log.reps || null
  } else {
    editWeight.value = log.weightKg || null
    editReps.value = log.reps || null
  }
}
async function saveEdit(log) {
  if (isTimedLog(log)) {
    await training.updateLog(log.id, { weightKg: 0, reps: editValue.value || 0 })
  } else {
    await training.updateLog(log.id, { weightKg: editWeight.value || 0, reps: editReps.value || 0 })
  }
  cancelEdit()
}
function cancelEdit() { editingId.value = '' }

// 删除（二次确认）
const deleteArmId = ref('')
async function confirmDelete(logId) {
  await training.deleteLog(logId)
  deleteArmId.value = ''
}

// 更换动作（整组批量换，针对"记错动作/动作库新增"的更正场景）
const swapPicker = ref(null) // { exerciseId, name, count }
function openSwapPicker(g) {
  swapPicker.value = { exerciseId: g.exerciseId, name: g.name, count: g.logs.length }
}
// 该日其它分组的动作置灰（沿用 picker「已在该日」语义），避免误合并
const swapUsedIds = computed(() => {
  const cur = swapPicker.value?.exerciseId
  const set = new Set()
  for (const g of groups.value) {
    if (g.exerciseId !== cur) set.add(g.exerciseId)
  }
  return set
})
async function onSwapSelect(newId) {
  const cur = swapPicker.value
  swapPicker.value = null
  if (!cur || newId === cur.exerciseId) return
  const ex = training.allExercises.find(e => e.id === newId)
  const name = ex?.name || newId
  if (!confirm(`将该组 ${cur.count} 组记录改为「${name}」？`)) return
  try {
    await training.changeLogExercise(date.value, cur.exerciseId, newId)
  } catch (e) {
    alert('操作失败：' + (e?.message || String(e)))
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function goBack() {
  router.back()
}

// 返回键由 App.vue 全局统一处理（先关浮层/内联态再返回）；顶部返回按钮走 goBack
onMounted(async () => {
  if (!training.scheduleLoaded) await training.init()
  await training.loadHistory()
})
</script>

<style scoped>
.history-detail-view {
  padding: calc(var(--sp-4) + var(--safe-top-real, env(safe-area-inset-top))) 16px 16px;
  padding-bottom: calc(16px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
}
.detail-topbar {
  margin-bottom: 12px;
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.back-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.back-icon {
  transform: rotate(180deg);
}
.detail-header {
  background: linear-gradient(135deg, var(--surface), var(--surface-hover));
  border: 1px solid var(--border-strong);
  margin-bottom: 12px;
}
.detail-date {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.3px;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.tag-daytype {
  font-size: 12px;
  background: var(--accent-dim);
  color: var(--accent-strong);
  padding: 3px 12px;
  border-radius: 20px;
}
.detail-sets {
  font-size: 12px;
  color: var(--text-secondary);
}
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ex-card {
  padding: 14px 16px;
}
.ex-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--border);
}
.ex-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ex-tag {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 20px;
}
.ex-tag.machine {
  background: var(--success-dim);
  color: var(--success);
}
.ex-tag.free {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
}
.ex-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ex-swap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-tertiary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s var(--easing);
}
.ex-swap:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.ex-sets {
  display: flex;
  flex-direction: column;
}
.set-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.set-row:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}
.set-detail {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.set-num {
  font-size: 13px;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.set-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}
.set-value.done {
  color: var(--text-secondary);
}
.set-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.act-btn {
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
  transition: all 0.2s var(--easing);
  font-size: 11px;
  padding: 0;
}
.act-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.act-btn.danger:hover {
  color: var(--danger);
  border-color: var(--danger);
}
.act-btn.armed {
  width: auto;
  padding: 0 10px;
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-dim);
  font-size: 12px;
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.edit-input {
  width: 56px;
  height: 34px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  padding: 0 8px;
  font-size: 13px;
  outline: none;
}
.edit-input:focus {
  border-color: var(--accent);
}
.edit-unit,
.edit-times {
  font-size: 12px;
  color: var(--text-secondary);
}
.edit-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.edit-btn.save {
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 600;
}
</style>

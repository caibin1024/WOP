import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId } from '../database'

/**
 * 有氧模块 Store（type = 'swim' 游泳 / 'stair' 爬楼机 / 'treadmill' 跑步机 / 'bike' 动感单车）
 * 共用 aerobic_logs 表：游泳记 distance_m（米）；爬楼机/跑步机/动感单车记 distance_km（千米）。
 * floors 为历史层数列（stair 1.0.1 起改公里，仅保留旧数据）。
 */
export const useAerobicStore = defineStore('aerobic', () => {
  const logs = ref([])
  const isLoading = ref(false)

  // 按类型过滤
  const swimLogs = computed(() => logs.value.filter(l => l.type === 'swim'))
  const stairLogs = computed(() => logs.value.filter(l => l.type === 'stair'))
  const treadmillLogs = computed(() => logs.value.filter(l => l.type === 'treadmill'))
  const bikeLogs = computed(() => logs.value.filter(l => l.type === 'bike'))

  // 游泳统计
  const swimTotalDistance = computed(() => swimLogs.value.reduce((s, l) => s + (l.distanceM || 0), 0))
  const swimTotalSessions = computed(() => swimLogs.value.length)

  // 爬楼机统计（公里）
  const stairTotalDistance = computed(() => stairLogs.value.reduce((s, l) => s + (l.distanceKm || 0), 0))
  const stairTotalSessions = computed(() => stairLogs.value.length)

  // 跑步机统计
  const treadmillTotalDistance = computed(() => treadmillLogs.value.reduce((s, l) => s + (l.distanceKm || 0), 0))
  const treadmillTotalSessions = computed(() => treadmillLogs.value.length)

  // 动感单车统计
  const bikeTotalDistance = computed(() => bikeLogs.value.reduce((s, l) => s + (l.distanceKm || 0), 0))
  const bikeTotalSessions = computed(() => bikeLogs.value.length)

  async function load() {
    isLoading.value = true
    try {
      await initDatabase()
      const rows = await query('SELECT * FROM aerobic_logs ORDER BY date DESC')
      logs.value = rows.map(r => ({
        id: r.id,
        type: r.type || 'swim',
        date: r.date,
        distanceM: r.distance_m,
        floors: r.floors,
        distanceKm: r.distance_km,
        durationMin: r.duration_min,
        afterStrength: !!r.after_strength,
        notes: r.notes
      }))
    } finally {
      isLoading.value = false
    }
  }

  async function addLog({ type = 'swim', date, distanceM = 0, floors = 0, distanceKm = 0, durationMin, afterStrength = false, notes = '' }) {
    const id = genId()
    await run(
      `INSERT INTO aerobic_logs (id, type, date, distance_m, floors, distance_km, duration_min, after_strength, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type, date, distanceM, floors, distanceKm, durationMin, afterStrength ? 1 : 0, notes]
    )
    await load()
  }

  async function deleteLog(id) {
    await run('DELETE FROM aerobic_logs WHERE id = ?', [id])
    await load()
  }

  async function updateLog(id, fields) {
    const sets = []
    const values = []
    if ('type' in fields) { sets.push('type = ?'); values.push(fields.type) }
    if ('distanceM' in fields) { sets.push('distance_m = ?'); values.push(fields.distanceM) }
    if ('floors' in fields) { sets.push('floors = ?'); values.push(fields.floors) }
    if ('distanceKm' in fields) { sets.push('distance_km = ?'); values.push(fields.distanceKm) }
    if ('durationMin' in fields) { sets.push('duration_min = ?'); values.push(fields.durationMin) }
    if ('afterStrength' in fields) { sets.push('after_strength = ?'); values.push(fields.afterStrength ? 1 : 0) }
    if ('notes' in fields) { sets.push('notes = ?'); values.push(fields.notes) }
    if (sets.length === 0) return
    values.push(id)
    await run(`UPDATE aerobic_logs SET ${sets.join(', ')} WHERE id = ?`, values)
    await load()
  }

  return {
    logs, isLoading,
    swimLogs, stairLogs, treadmillLogs, bikeLogs,
    swimTotalDistance, swimTotalSessions,
    stairTotalDistance, stairTotalSessions,
    treadmillTotalDistance, treadmillTotalSessions,
    bikeTotalDistance, bikeTotalSessions,
    load, addLog, deleteLog, updateLog
  }
})

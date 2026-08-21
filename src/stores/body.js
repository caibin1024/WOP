import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId, todayStr } from '../database'
import { useProfileStore } from './profile'

/**
 * 身体数据 Store
 * 体重、BMI 记录与趋势
 */
export const useBodyStore = defineStore('body', () => {
  const records = ref([])
  const isLoading = ref(false)
  const profile = useProfileStore()

  // 计算 BMI：身高取个人资料（设置页可编辑），未加载时兜底 172cm
  function calcBmi(weightKg) {
    if (!weightKg) return null
    const h = (profile.heightCm || 172) / 100
    return Math.round((weightKg / (h * h)) * 10) / 10
  }

  const latest = computed(() => {
    return records.value.length > 0 ? records.value[0] : null
  })

  const latestBmi = computed(() => latest.value?.bmi ?? null)

  async function load() {
    isLoading.value = true
    try {
      await initDatabase()
      const rows = await query('SELECT * FROM body_records ORDER BY date DESC')
      records.value = rows.map(r => ({
        id: r.id,
        date: r.date,
        weightKg: r.weight_kg,
        bmi: r.bmi,
        bodyFat: r.body_fat,
        notes: r.notes
      }))
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 新增/更新记录。同一日期存在则更新
   */
  async function saveRecord({ date, weightKg, notes = '' }) {
    const bmi = calcBmi(weightKg)
    const existing = records.value.find(r => r.date === date)
    if (existing) {
      await run(
        `UPDATE body_records SET weight_kg = ?, bmi = ?, notes = ? WHERE date = ?`,
        [weightKg, bmi, notes, date]
      )
    } else {
      const id = genId()
      await run(
        `INSERT INTO body_records (id, date, weight_kg, bmi, body_fat, notes) VALUES (?, ?, ?, ?, NULL, ?)`,
        [id, date, weightKg, bmi, notes]
      )
    }
    await load()
  }

  async function deleteRecord(id) {
    await run('DELETE FROM body_records WHERE id = ?', [id])
    await load()
  }

  return { records, latest, latestBmi, isLoading, load, saveRecord, deleteRecord, calcBmi }
})

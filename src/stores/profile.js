import { defineStore } from 'pinia'
import { ref } from 'vue'
import { initDatabase, query, run } from '../database'

/**
 * 个人资料 Store
 * 身高/年龄/性别/目标/优先级，持久化到 app_meta 表
 * 体重不入库：以身体页 body_records 的最新记录为准（唯一数据源）
 */
export const useProfileStore = defineStore('profile', () => {
  const heightCm = ref(172)
  const age = ref(28)
  const gender = ref('male') // male | female
  const goal = ref('综合增肌减脂')
  const priority = ref('肩>胸>背>腹')
  const loaded = ref(false)

  const KEYS = {
    heightCm: 'profile_height_cm',
    age: 'profile_age',
    gender: 'profile_gender',
    goal: 'profile_goal',
    priority: 'profile_priority'
  }

  async function load() {
    await initDatabase()
    const rows = await query('SELECT * FROM app_meta')
    const map = {}
    for (const r of rows) map[r.key] = r.value
    heightCm.value = Number(map[KEYS.heightCm]) || 172
    age.value = Number(map[KEYS.age]) || 28
    gender.value = map[KEYS.gender] || 'male'
    goal.value = map[KEYS.goal] || '综合增肌减脂'
    priority.value = map[KEYS.priority] || '肩>胸>背>腹'
    loaded.value = true
  }

  async function save() {
    await initDatabase()
    const values = {
      heightCm: String(Math.round(Number(heightCm.value)) || 172),
      age: String(Math.round(Number(age.value)) || 28),
      gender: gender.value === 'female' ? 'female' : 'male',
      goal: goal.value,
      priority: priority.value
    }
    for (const [field, key] of Object.entries(KEYS)) {
      await run(
        `INSERT INTO app_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, values[field]]
      )
    }
  }

  return { heightCm, age, gender, goal, priority, loaded, load, save }
})

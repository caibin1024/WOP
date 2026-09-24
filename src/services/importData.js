import { runInTransaction, withTransaction, genId, todayStr } from '../database'
import { TIMED_EXERCISE_IDS, SEED_WORKOUT_PLAN, getDayTypeForDate } from '../database/seed'

const DAY_TYPES = ['push', 'pull', 'legs']

// 预置计划的 exerciseId -> restSeconds（导入 workout_day_exercises 补 rest_seconds 用）
const REST_BY_EXERCISE = {}
for (const day of SEED_WORKOUT_PLAN) {
  for (const ex of day.exercises) REST_BY_EXERCISE[ex.exerciseId] = ex.restSeconds
}

/**
 * 导入训练数据（覆盖式恢复快照）
 * 解析导出 JSON，清空 5 张训练数据表后按结构逐项写回。
 * 清空 + 写回在同一事务内：任一步失败整体回滚，不会留下"旧数据已删、新数据半写"的损坏状态。
 * 保留 app_meta 里的计划偏移/漏练起始日、AI 会话等与训练数据无关的键。
 * @param {string} jsonText 导出文件内容
 * @returns {Promise<{plan:number, training:number, body:number, aerobic:number, defaults:number}>}
 */
export async function importAllData(jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch (e) {
    throw new Error('文件不是有效的 JSON，请选择导出的 .json 文件')
  }
  if (!data || typeof data !== 'object') throw new Error('文件内容无法识别')

  const hasAny = [data.userProfile, data.workoutPlan, data.trainingSessions, data.bodyRecords, data.aerobicLogs, data.exerciseDefaults]
    .some(v => v != null)
  if (!hasAny) throw new Error('文件中没有可导入的训练数据')

  // 导出计划里的动作 → 日型映射，用于推断训练记录的 day_type
  const planIdsByDay = { push: new Set(), pull: new Set(), legs: new Set() }
  for (const day of data.workoutPlan || []) {
    if (!planIdsByDay[day.dayType]) continue
    for (const ex of day.exercises || []) {
      if (ex?.exerciseId) planIdsByDay[day.dayType].add(ex.exerciseId)
    }
  }

  const counts = { plan: 0, training: 0, body: 0, aerobic: 0, defaults: 0 }

  // 覆盖式恢复：清空旧训练数据 + 写回新数据必须在同一事务里。
  // 若不用事务，中途失败（字段非法/磁盘满）会停在"旧数据已删、新数据只写了一半"的损坏状态。
  // 注意：事务体内一律用 runInTransaction（run 自带事务，嵌套会把外层一起回滚）。
  await withTransaction(async () => {
    await runInTransaction('DELETE FROM workout_day_exercises')
    await runInTransaction('DELETE FROM training_logs')
    await runInTransaction('DELETE FROM body_records')
    await runInTransaction('DELETE FROM aerobic_logs')
    await runInTransaction('DELETE FROM exercise_defaults')

    // 1. 个人资料（体重不入库，以 body_records 最新记录为准）
    if (data.userProfile) {
      const p = data.userProfile
      const kv = [
        ['profile_height_cm', String(Math.round(Number(p.heightCm)) || 172)],
        ['profile_age', String(Math.round(Number(p.age)) || 28)],
        ['profile_gender', p.gender === 'female' ? 'female' : 'male'],
        ['profile_goal', p.goal || '综合增肌减脂'],
        ['profile_priority', p.priority || '肩>胸>背>腹']
      ]
      for (const [k, v] of kv) {
        await runInTransaction(
          'INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          [k, v]
        )
      }
    }

    // 2. 训练计划 → workout_day_exercises（sort_order 按数组顺序）
    for (const day of data.workoutPlan || []) {
      if (!DAY_TYPES.includes(day.dayType)) continue
      const exercises = day.exercises || []
      for (let i = 0; i < exercises.length; i++) {
        const ex = exercises[i]
        if (!ex?.exerciseId) continue
        await runInTransaction(
          `INSERT INTO workout_day_exercises (id, day_type, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [genId(), day.dayType, ex.exerciseId, ex.targetSets ?? 4, ex.targetRepsMin ?? 10, ex.targetRepsMax ?? 12, REST_BY_EXERCISE[ex.exerciseId] ?? 90, i]
        )
        counts.plan++
      }
    }

    // 3. 训练记录 → training_logs（day_type 推断：优先导出字段 > 计划动作匹配 > 锚点推算）
    const heightCm = Math.round(Number(data.userProfile?.heightCm)) || 172
    for (const session of data.trainingSessions || []) {
      const date = session?.date
      if (!date) continue
      const exerciseIds = (session.exercises || []).map(e => e.exerciseId)
      const dayType = inferDayType(session, exerciseIds, date, planIdsByDay)
      for (const ex of session.exercises || []) {
        const isTimed = TIMED_EXERCISE_IDS.has(ex.exerciseId)
        for (const s of ex.sets || []) {
          const reps = isTimed ? (s.seconds ?? 0) : (s.reps ?? 0)
          const weight = isTimed ? 0 : (s.weightKg ?? 0)
          await runInTransaction(
            `INSERT INTO training_logs (id, date, day_type, exercise_id, exercise_name, set_number, weight_kg, reps, done)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [genId(), date, dayType, ex.exerciseId, ex.exerciseName || ex.exerciseId, s.setNum ?? 1, weight, reps, s.done ? 1 : 0]
          )
          counts.training++
        }
      }
    }

    // 4. 身体记录 → body_records（bmi 缺失时按身高重算）
    for (const r of data.bodyRecords || []) {
      if (!r?.date) continue
      const weight = Number(r.weightKg)
      if (!Number.isFinite(weight)) continue
      let bmi = Number(r.bmi)
      if (!Number.isFinite(bmi) || bmi <= 0) {
        const h = heightCm / 100
        bmi = Math.round((weight / (h * h)) * 10) / 10
      }
      await runInTransaction(
        'INSERT INTO body_records (id, date, weight_kg, bmi, body_fat, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [genId(), r.date, weight, bmi, r.bodyFat ?? null, r.notes || '']
      )
      counts.body++
    }

    // 5. 有氧记录 → aerobic_logs
    for (const l of data.aerobicLogs || []) {
      if (!l?.date) continue
      const type = ['swim', 'stair', 'treadmill', 'bike'].includes(l.type) ? l.type : 'swim'
      await runInTransaction(
        'INSERT INTO aerobic_logs (id, type, date, distance_m, floors, distance_km, duration_min, after_strength, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [genId(), type, l.date, l.distanceM ?? 0, l.floors ?? 0, l.distanceKm ?? 0, l.durationMin ?? 0, l.afterStrength ? 1 : 0, l.notes || '']
      )
      counts.aerobic++
    }

    // 6. 动作默认值 → exercise_defaults（UPSERT）
    for (const d of data.exerciseDefaults || []) {
      if (!d?.exerciseId) continue
      await runInTransaction(
        `INSERT INTO exercise_defaults (exercise_id, weight_kg, reps, seconds, target_sets, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(exercise_id) DO UPDATE SET
           weight_kg = excluded.weight_kg,
           reps = excluded.reps,
           seconds = excluded.seconds,
           target_sets = excluded.target_sets,
           updated_at = excluded.updated_at`,
        [d.exerciseId, d.weightKg ?? null, d.reps ?? null, d.seconds ?? null, d.targetSets ?? null, todayStr()]
      )
      counts.defaults++
    }
  })

  return counts
}

/**
 * 推断某次训练记录的 day_type：
 * 1. 导出文件自带 dayType 直接用；
 * 2. 用该次动作命中导出计划的哪个日型最多；
 * 3. 兜底按练三休一锚点（偏移 1）推算。
 */
function inferDayType(session, exerciseIds, date, planIdsByDay) {
  if (session.dayType && DAY_TYPES.includes(session.dayType)) return session.dayType

  let best = null
  let bestScore = 0
  for (const dt of DAY_TYPES) {
    let score = 0
    for (const id of exerciseIds) if (planIdsByDay[dt].has(id)) score++
    if (score > bestScore) { bestScore = score; best = dt }
  }
  if (best && bestScore > 0) return best

  return getDayTypeForDate(date, 1)
}

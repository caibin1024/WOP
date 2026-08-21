import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId, todayStr } from '../database'
import {
  getTodayDayType as seedGetTodayDayType,
  getDayTypeForDate as seedGetDayTypeForDate,
  SEED_EXERCISES
} from '../database/seed'

/**
 * 训练数据 Store
 * 管理：今日训练状态、训练记录、进度数据
 */
export const useTrainingStore = defineStore('training', () => {
  const todayDayType = ref(seedGetTodayDayType(1)) // 默认偏移 1：今天为休息日，避免首帧闪 Push
  const scheduleOffset = ref(1)                     // 练三休一计划已顺延的天数
  const scheduleLoaded = ref(false)                 // 是否已从 DB 读取偏移
  const missStartDate = ref(todayStr())             // 漏练判断起始日（安装后开始，可调整）
  const todayExercises = ref([])        // 今日动作列表（含目标组数）
  const todayLogs = ref([])             // 今日训练记录
  const historyByDate = ref({})         // 历史记录 { date: [logs] }
  const planByDay = ref({ push: [], pull: [], legs: [] }) // 计划动作配置（workout_day_exercises 表，可自定义）
  const isLoading = ref(false)
  const isSeeded = ref(false)

  const allExercises = ref([...SEED_EXERCISES])

  // 计算：今日完成情况
  const todayProgress = computed(() => {
    const total = todayExercises.value.reduce((s, e) => s + e.targetSets, 0)
    const done = todayLogs.value.filter(l => l.done).length
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  // 计算：今日是否已有训练记录（决定今日页显示计划 or 已完成提示）
  const hasTodayLog = computed(() => todayLogs.value.length > 0)

  let initPromise = null
  /**
   * 初始化：建表 + 读取计划偏移 + 刷新今日状态（幂等，重复调用返回同一 Promise）
   */
  function init() {
    if (initPromise) return initPromise
    initPromise = (async () => {
      isLoading.value = true
      try {
        await initDatabase()
        await loadScheduleOffset()
        await loadMissStart()
        await loadPlan()
        await refreshToday()
        await loadHistory()
      } finally {
        isLoading.value = false
      }
    })()
    return initPromise
  }

  /**
   * 加载今日训练记录
   */
  async function loadTodayLogs() {
    const rows = await query(
      'SELECT * FROM training_logs WHERE date = ? ORDER BY set_number',
      [todayStr()]
    )
    todayLogs.value = rows.map(r => ({
      id: r.id,
      date: r.date,
      dayType: r.day_type,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      setNumber: r.set_number,
      weightKg: r.weight_kg,
      reps: r.reps,
      done: !!r.done
    }))
  }

  /**
   * 从 app_meta 读取计划顺延偏移
   */
  async function loadScheduleOffset() {
    try {
      const rows = await query("SELECT value FROM app_meta WHERE key = 'schedule_offset_days'", [])
      const n = rows.length ? Number(rows[0].value) : 1
      scheduleOffset.value = Number.isFinite(n) ? n : 1
    } catch (e) {
      scheduleOffset.value = 1
    }
    scheduleLoaded.value = true
  }

  /**
   * 加载漏练判断起始日；老库无此键时默认今天并写回（即"安装后开始判断"）
   */
  async function loadMissStart() {
    try {
      const rows = await query("SELECT value FROM app_meta WHERE key = 'miss_start_date'", [])
      if (rows.length) {
        missStartDate.value = rows[0].value || todayStr()
      } else {
        // 老库升级兜底：写入今天，此后稳定
        await run(
          `INSERT INTO app_meta (key, value) VALUES ('miss_start_date', ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [todayStr()]
        )
        missStartDate.value = todayStr()
      }
    } catch (e) {
      missStartDate.value = todayStr()
    }
  }

  /**
   * 设置漏练判断起始日（调整入口：长按过去日期触发）
   */
  async function setMissStart(dateStr) {
    await run(
      `INSERT INTO app_meta (key, value) VALUES ('miss_start_date', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [dateStr]
    )
    missStartDate.value = dateStr
  }

  /**
   * 用当前偏移计算某日期的计划类型（普通函数，渲染期读取 scheduleOffset 会被响应式追踪）
   * @param {string} dateStr 本地 YYYY-MM-DD
   * @param {number} offsetOverride 覆盖偏移（用于预览顺延后效果）
   */
  function getDayTypeForDate(dateStr, offsetOverride = scheduleOffset.value) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return seedGetDayTypeForDate(new Date(y, m - 1, d), offsetOverride)
  }

  /**
   * 加载计划动作配置（workout_day_exercises 表为唯一数据源），按日型分组并 join 动作详情
   */
  async function loadPlan() {
    const rows = await query(
      'SELECT * FROM workout_day_exercises ORDER BY day_type, sort_order',
      []
    )
    const byDay = { push: [], pull: [], legs: [] }
    for (const r of rows) {
      if (!byDay[r.day_type]) continue
      const exercise = allExercises.value.find(e => e.id === r.exercise_id)
      if (!exercise) continue // 动作库中无此动作（理论不会发生），跳过
      byDay[r.day_type].push({
        id: r.id,
        dayType: r.day_type,
        exerciseId: r.exercise_id,
        exercise,
        targetSets: r.target_sets,
        targetRepsMin: r.target_reps_min,
        targetRepsMax: r.target_reps_max,
        sortOrder: r.sort_order
      })
    }
    planByDay.value = byDay
  }

  /**
   * 按当前偏移刷新今日状态（dayType / 动作列表 / 记录）。
   * 计划以 workout_day_exercises 表为准（设置页可自定义），由 planByDay 供数。
   */
  async function refreshToday() {
    todayDayType.value = seedGetTodayDayType(scheduleOffset.value)
    const dayPlan = planByDay.value[todayDayType.value] || []
    todayExercises.value = dayPlan.map((w, i) => ({ ...w, sortOrder: i }))
    await loadTodayLogs()
  }

  /** 计划操作后统一刷新：重读计划 + 今日页。写库失败则抛错，由调用方处理 */
  async function reloadPlanAndToday() {
    await loadPlan()
    await refreshToday()
  }

  /**
   * 换动作：把某槽位的动作替换为另一动作（保留该槽的组数/次数）
   */
  async function swapPlanExercise(dayType, slotId, newExerciseId) {
    await run('UPDATE workout_day_exercises SET exercise_id = ? WHERE id = ?', [newExerciseId, slotId])
    await reloadPlanAndToday()
  }

  /**
   * 添加动作：追加到某日型末尾（按推荐重量兜底默认值）
   */
  async function addPlanExercise(dayType, exerciseId) {
    const dayPlan = planByDay.value[dayType] || []
    const maxOrder = dayPlan.reduce((m, s) => Math.max(m, s.sortOrder), -1)
    const exercise = allExercises.value.find(e => e.id === exerciseId)
    const isTimed = exercise?.special === 'seconds'
    const isWarmup = exercise?.category === 'warmup'
    const timedSecs = isTimed ? (exercise?.recommendedSeconds ?? 45) : null
    await run(
      `INSERT INTO workout_day_exercises (id, day_type, exercise_id, target_sets, target_reps_min, target_reps_max, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        genId(), dayType, exerciseId,
        isTimed ? 3 : 4,
        timedSecs,
        timedSecs,
        maxOrder + 1
      ]
    )
    // 负重动作若从未配置过默认值，以推荐重量兜底，今日页预填即有重量；
    // 已有自定义默认值（今日页/设置页存过）则保留，不覆盖
    if (exercise?.recommendedWeightKg != null) {
      const existing = await getExerciseDefault(exerciseId)
      if (!existing) {
        await saveExerciseDefault({ exerciseId, weightKg: exercise.recommendedWeightKg, reps: null, seconds: null, targetSets: null })
      }
    }
    await reloadPlanAndToday()
  }

  /**
   * 删除动作：删除槽位并重排该日 sort_order
   */
  async function removePlanExercise(dayType, slotId) {
    const dayPlan = (planByDay.value[dayType] || []).filter(s => s.id !== slotId)
    await run('DELETE FROM workout_day_exercises WHERE id = ?', [slotId])
    const sorted = [...dayPlan].sort((a, b) => a.sortOrder - b.sortOrder)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].sortOrder !== i) {
        await run('UPDATE workout_day_exercises SET sort_order = ? WHERE id = ?', [i, sorted[i].id])
      }
    }
    await reloadPlanAndToday()
  }

  /**
   * 上移/下移：与相邻槽位交换 sort_order（dir = -1 上移 / +1 下移）
   */
  async function movePlanExercise(dayType, slotId, dir) {
    const dayPlan = [...(planByDay.value[dayType] || [])].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = dayPlan.findIndex(s => s.id === slotId)
    const to = idx + dir
    if (idx < 0 || to < 0 || to >= dayPlan.length) return
    const a = dayPlan[idx]
    const b = dayPlan[to]
    await run('UPDATE workout_day_exercises SET sort_order = ? WHERE id = ?', [b.sortOrder, a.id])
    await run('UPDATE workout_day_exercises SET sort_order = ? WHERE id = ?', [a.sortOrder, b.id])
    await reloadPlanAndToday()
  }

  /**
   * 保存计划槽位配置（组数/次数）。
   * 组数/次数同步到 exercise_defaults：getEffectiveDefaults 中档以动作默认值优先，
   * 让今日页预填与计划配置一致（同动作出现在多日时以后保存的为准）。
   */
  async function savePlanSlot(dayType, slotId, { targetSets, targetRepsMin, targetRepsMax }) {
    const slot = (planByDay.value[dayType] || []).find(s => s.id === slotId)
    if (!slot) return
    await run(
      `UPDATE workout_day_exercises SET target_sets = ?, target_reps_min = ?, target_reps_max = ? WHERE id = ?`,
      [
        targetSets ?? slot.targetSets,
        targetRepsMin ?? slot.targetRepsMin,
        targetRepsMax ?? slot.targetRepsMax,
        slotId
      ]
    )
    if (targetSets != null || targetRepsMin != null) {
      const def = await getExerciseDefault(slot.exerciseId)
      await saveExerciseDefault({
        exerciseId: slot.exerciseId,
        weightKg: def?.weightKg ?? null,
        reps: targetRepsMin != null ? targetRepsMin : (def?.reps ?? null),
        seconds: def?.seconds ?? null,
        targetSets: targetSets != null ? targetSets : (def?.targetSets ?? null)
      })
    }
    await reloadPlanAndToday()
  }

  /**
   * 保存动作默认配置（重量/次数/秒数）→ exercise_defaults。
   * 未传的字段保留现有值（避免单字段更新清空其它列）；
   * 组数改动会同步到该动作在计划中的所有槽位（保持计划与动作默认一致）。
   */
  async function savePlanWeightDefault(exerciseId, { weightKg, reps, seconds, targetSets }) {
    const existing = await getExerciseDefault(exerciseId)
    await saveExerciseDefault({
      exerciseId,
      weightKg: weightKg ?? existing?.weightKg ?? null,
      reps: reps ?? existing?.reps ?? null,
      seconds: seconds ?? existing?.seconds ?? null,
      targetSets: targetSets ?? existing?.targetSets ?? null
    })
    if (targetSets != null) {
      for (const dt of ['push', 'pull', 'legs']) {
        for (const slot of planByDay.value[dt] || []) {
          if (slot.exerciseId === exerciseId && slot.targetSets !== targetSets) {
            await run('UPDATE workout_day_exercises SET target_sets = ? WHERE id = ?', [targetSets, slot.id])
          }
        }
      }
    }
    await reloadPlanAndToday()
  }

  /**
   * 停练顺延：练三休一计划整体后移 1 天并持久化
   */
  async function postponeSchedule() {
    const next = scheduleOffset.value + 1
    await run(
      `INSERT INTO app_meta (key, value) VALUES ('schedule_offset_days', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [String(next)]
    )
    scheduleOffset.value = next
    await refreshToday()
  }

  /**
   * 记录一组训练
   */
  async function logSet({ date, dayType, exerciseId, exerciseName, setNumber, weightKg, reps, done }) {
    const id = genId()
    await run(
      `INSERT INTO training_logs (id, date, day_type, exercise_id, exercise_name, set_number, weight_kg, reps, done)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, dayType, exerciseId, exerciseName, setNumber, weightKg, reps, done ? 1 : 0]
    )
    if (date === todayStr()) {
      await loadTodayLogs()
    }
    await loadHistory()
  }

  /**
   * 加载历史记录（最近90天）
   */
  async function loadHistory() {
    const rows = await query(
      `SELECT * FROM training_logs ORDER BY date DESC LIMIT 3000`
    )
    const byDate = {}
    for (const r of rows) {
      if (!byDate[r.date]) byDate[r.date] = []
      byDate[r.date].push({
        id: r.id,
        date: r.date,
        dayType: r.day_type,
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        setNumber: r.set_number,
        weightKg: r.weight_kg,
        reps: r.reps,
        done: !!r.done
      })
    }
    historyByDate.value = byDate
  }

  /**
   * 统一保存今日所有已标记完成的组
   * setInputs: { [exerciseIdx]: { [setNum]: { weight, reps, done } } }
   * @returns 保存的组数
   */
  async function saveAllToday(setInputs) {
    const date = todayStr()
    const dayType = todayDayType.value
    let count = 0
    for (let idx = 0; idx < todayExercises.value.length; idx++) {
      const wde = todayExercises.value[idx]
      const inputs = setInputs[idx]
      if (!inputs) continue
      for (const setStr of Object.keys(inputs)) {
        const s = inputs[setStr]
        if (!s || !s.done) continue
        await run(
          `INSERT INTO training_logs (id, date, day_type, exercise_id, exercise_name, set_number, weight_kg, reps, done)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [genId(), date, dayType, wde.exerciseId, wde.exercise.name, Number(setStr), s.weight || 0, s.reps || 0]
        )
        count++
      }
    }
    await loadTodayLogs()
    await loadHistory()
    return count
  }

  /**
   * 获取某动作的自定义默认值（无则 null；含组数 targetSets）
   */
  async function getExerciseDefault(exerciseId) {
    const rows = await query(
      'SELECT weight_kg, reps, seconds, target_sets FROM exercise_defaults WHERE exercise_id = ?',
      [exerciseId]
    )
    if (!rows.length) return null
    const r = rows[0]
    return { weightKg: r.weight_kg, reps: r.reps, seconds: r.seconds, targetSets: r.target_sets }
  }

  /**
   * 保存/更新某动作的自定义默认值（UPSERT，含组数）
   */
  async function saveExerciseDefault({ exerciseId, weightKg, reps, seconds, targetSets }) {
    await run(
      `INSERT INTO exercise_defaults (exercise_id, weight_kg, reps, seconds, target_sets, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(exercise_id) DO UPDATE SET
         weight_kg = excluded.weight_kg,
         reps = excluded.reps,
         seconds = excluded.seconds,
         target_sets = excluded.target_sets,
         updated_at = excluded.updated_at`,
      [exerciseId, weightKg ?? null, reps ?? null, seconds ?? null, targetSets ?? null, todayStr()]
    )
  }

  /**
   * 该动作今天之前最近一次训练的全部组（逐组原样，供最高级默认值）
   * @returns {null|{date:string, sets:Array<{setNumber:number,weightKg:number,reps:number}>}}
   */
  async function getLastSessionForExercise(exerciseId) {
    const rows = await query(
      `SELECT date, set_number, weight_kg, reps FROM training_logs
       WHERE exercise_id = ? AND date < ? AND done = 1
       ORDER BY date DESC, set_number ASC`,
      [exerciseId, todayStr()]
    )
    if (!rows.length) return null
    const lastDate = rows[0].date
    const sets = rows.filter(r => r.date === lastDate).map(r => ({
      setNumber: r.set_number,
      weightKg: r.weight_kg,
      reps: r.reps
    }))
    return { date: lastDate, sets }
  }

  /**
   * 计算某动作的有效默认值（组数 + 每组重量/次数/秒数）。
   * 优先级：上次训练记录（最高）> 动作库配置（中）> 系统默认（低）。
   * @returns {setNumbers:number[], perSet:Object<number,{weightKg:number|null,reps:number|null}>}
   */
  async function getEffectiveDefaults(exerciseId, wde) {
    const isTimed = wde?.special === 'seconds' || wde?.exercise?.special === 'seconds'
    const isWarmup = wde?.exercise?.category === 'warmup'
    const sysWeight = wde?.exercise?.recommendedWeightKg ?? null
    const sysReps = isTimed
      ? (wde?.exercise?.recommendedSeconds ?? null)
      : (wde?.targetRepsMin ?? null)

    // 最高级：上次训练记录（逐组原样带出）
    const last = await getLastSessionForExercise(exerciseId)
    if (last && last.sets.length) {
      const perSet = {}
      for (const s of last.sets) {
        perSet[s.setNumber] = {
          weightKg: isTimed || isWarmup ? null : (s.weightKg || null),
          reps: s.reps || null // 计时动作的 reps 列即秒数
        }
      }
      return { setNumbers: last.sets.map(s => s.setNumber), perSet }
    }

    // 中级：动作库配置（含组数 targetSets）
    const def = await getExerciseDefault(exerciseId)
    const hasConfig = def && (
      def.weightKg != null || def.reps != null || def.seconds != null || def.targetSets != null
    )
    if (hasConfig) {
      const count = def.targetSets || wde.targetSets || 1
      const setNumbers = Array.from({ length: count }, (_, i) => i + 1)
      const perSet = {}
      for (const n of setNumbers) {
        perSet[n] = {
          weightKg: isTimed || isWarmup ? null : (def.weightKg ?? sysWeight),
          reps: isTimed ? (def.seconds ?? (wde?.exercise?.recommendedSeconds ?? null)) : (def.reps ?? sysReps)
        }
      }
      return { setNumbers, perSet }
    }

    // 最低级：系统默认
    const count = wde.targetSets || 1
    const setNumbers = Array.from({ length: count }, (_, i) => i + 1)
    const perSet = {}
    for (const n of setNumbers) {
      perSet[n] = {
        weightKg: isTimed || isWarmup ? null : sysWeight,
        reps: sysReps
      }
    }
    return { setNumbers, perSet }
  }

  /**
   * 读取当天训练草稿（临时库）：未点"完成"前的每组输入/标记状态
   * @returns {Object<exerciseId, Object<setNumber,{weightKg,reps,done}>>}
   */
  async function loadTodayDraft() {
    const rows = await query(
      `SELECT exercise_id, set_number, weight_kg, reps, done FROM training_draft
       WHERE date = ? ORDER BY set_number`,
      [todayStr()]
    )
    const draft = {}
    for (const r of rows) {
      if (!draft[r.exercise_id]) draft[r.exercise_id] = {}
      draft[r.exercise_id][r.set_number] = {
        weightKg: r.weight_kg,
        reps: r.reps,
        done: !!r.done
      }
    }
    return draft
  }

  /**
   * 把今日全部输入骨架写入临时库（UPSERT 每组）
   */
  async function saveAllDraft(setInputs, todayExercises) {
    const date = todayStr()
    for (let idx = 0; idx < todayExercises.length; idx++) {
      const wde = todayExercises[idx]
      const inputs = setInputs[idx]
      if (!inputs) continue
      for (const setStr of Object.keys(inputs)) {
        const s = inputs[setStr]
        if (!s) continue
        await run(
          `INSERT INTO training_draft (date, exercise_id, set_number, weight_kg, reps, done)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(date, exercise_id, set_number) DO UPDATE SET
             weight_kg = excluded.weight_kg, reps = excluded.reps, done = excluded.done`,
          [date, wde.exerciseId, Number(setStr), s.weight ?? 0, s.reps ?? 0, s.done ? 1 : 0]
        )
      }
    }
  }

  /**
   * 清空当天训练草稿（点"完成今日训练"后调用）
   */
  async function clearTodayDraft() {
    await run('DELETE FROM training_draft WHERE date = ?', [todayStr()])
  }

  /**
   * 删除临时库中的某一组（今日页长按"第N组"删除该组时调用）。
   * saveAllDraft 只 UPSERT 现存行，不会清理被删的行，必须显式 DELETE 防止闪退重开时残留恢复。
   */
  async function removeDraftSet(exerciseId, setNumber) {
    await run('DELETE FROM training_draft WHERE date = ? AND exercise_id = ? AND set_number = ?',
      [todayStr(), exerciseId, setNumber])
  }

  /**
   * 修改一条训练记录
   */
  async function updateLog(logId, { weightKg, reps }) {
    await run('UPDATE training_logs SET weight_kg = ?, reps = ? WHERE id = ?', [weightKg, reps, logId])
    await loadTodayLogs()
    await loadHistory()
  }

  /**
   * 删除一条训练记录
   */
  async function deleteLog(logId) {
    await run('DELETE FROM training_logs WHERE id = ?', [logId])
    await loadTodayLogs()
    await loadHistory()
  }

  /**
   * 获取某动作的历史最佳重量
   */
  async function getExerciseBest(exerciseId) {
    const rows = await query(
      `SELECT MAX(weight_kg) as max_weight FROM training_logs WHERE exercise_id = ? AND done = 1`,
      [exerciseId]
    )
    return rows[0]?.max_weight || null
  }

  /**
   * 获取某动作的历史记录（用于进度图）
   */
  async function getExerciseHistory(exerciseId) {
    const rows = await query(
      `SELECT date, MAX(weight_kg) as max_weight FROM training_logs
       WHERE exercise_id = ? AND done = 1
       GROUP BY date ORDER BY date ASC`,
      [exerciseId]
    )
    return rows
  }

  return {
    todayDayType,
    scheduleOffset,
    scheduleLoaded,
    missStartDate,
    loadMissStart,
    setMissStart,
    todayExercises,
    todayLogs,
    historyByDate,
    allExercises,
    planByDay,
    loadPlan,
    swapPlanExercise,
    addPlanExercise,
    removePlanExercise,
    movePlanExercise,
    savePlanSlot,
    savePlanWeightDefault,
    isLoading,
    todayProgress,
    hasTodayLog,
    init,
    loadScheduleOffset,
    postponeSchedule,
    getDayTypeForDate,
    logSet,
    saveAllToday,
    getExerciseDefault,
    saveExerciseDefault,
    getLastSessionForExercise,
    getEffectiveDefaults,
    loadTodayDraft,
    saveAllDraft,
    clearTodayDraft,
    removeDraftSet,
    updateLog,
    deleteLog,
    loadTodayLogs,
    loadHistory,
    getExerciseBest,
    getExerciseHistory
  }
})

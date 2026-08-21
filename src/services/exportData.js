import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { query, todayStr } from '../database'
import { PLAN_LABELS, SEED_EXERCISES } from '../database/seed'
import { useProfileStore } from '../stores/profile'
import { APP_VERSION } from '../version'

// 计时动作（如平板支撑）：reps 列实际存秒数，导出时用 seconds 字段表意，避免被当作次数
const TIMED_EXERCISE_IDS = new Set(SEED_EXERCISES.filter(e => e.special === 'seconds').map(e => e.id))

const isNative = Capacitor.isNativePlatform()

/**
 * 导出训练数据为 JSON
 * 生成完整数据文件，供用户上传给 AI 分析
 */
export async function exportAllData() {
  const exportDate = new Date().toISOString()
  const profile = useProfileStore()
  if (!profile.loaded) await profile.load()

  const [trainingLogs, bodyRecords, aerobicLogs, exerciseDefaults, planRows] = await Promise.all([
    query('SELECT * FROM training_logs ORDER BY date, set_number'),
    query('SELECT * FROM body_records ORDER BY date'),
    query('SELECT * FROM aerobic_logs ORDER BY date'),
    query('SELECT * FROM exercise_defaults ORDER BY exercise_id'),
    query('SELECT * FROM workout_day_exercises ORDER BY day_type, sort_order')
  ])

  // 汇总训练记录
  const logsByDate = {}
  const nameByExercise = {}
  for (const r of trainingLogs) {
    nameByExercise[r.exercise_id] = r.exercise_name
    if (!logsByDate[r.date]) logsByDate[r.date] = {}
    if (!logsByDate[r.date][r.exercise_id]) logsByDate[r.date][r.exercise_id] = []
    if (TIMED_EXERCISE_IDS.has(r.exercise_id)) {
      logsByDate[r.date][r.exercise_id].push({
        setNum: r.set_number,
        seconds: r.reps, // 计时动作按秒记录
        done: !!r.done
      })
    } else {
      logsByDate[r.date][r.exercise_id].push({
        setNum: r.set_number,
        weightKg: r.weight_kg,
        reps: r.reps,
        done: !!r.done
      })
    }
  }

  const trainingSessions = Object.keys(logsByDate).sort().map(date => {
    const exercises = Object.keys(logsByDate[date]).map(exId => {
      const sets = logsByDate[date][exId]
      return {
        exerciseId: exId,
        exerciseName: nameByExercise[exId] || exId,
        sets: sets
      }
    })
    return { date, exercises }
  })

  // 最新体重：body_records 时间正序，末条即最新
  const latestWeightKg = bodyRecords.length > 0
    ? bodyRecords[bodyRecords.length - 1].weight_kg
    : null

  // 自定义计划：读 workout_day_exercises 表（反映设置页的换/增删/排序），标签静态
  const DAY_ORDER = ['push', 'pull', 'legs']
  const planByDay = { push: [], pull: [], legs: [] }
  for (const r of planRows) {
    if (!planByDay[r.day_type]) continue
    planByDay[r.day_type].push({
      exerciseId: r.exercise_id,
      targetSets: r.target_sets,
      targetRepsMin: r.target_reps_min,
      targetRepsMax: r.target_reps_max
    })
  }
  const workoutPlan = DAY_ORDER.map(dt => ({
    dayType: dt,
    label: PLAN_LABELS[dt]?.label || dt,
    description: PLAN_LABELS[dt]?.description || '',
    exercises: planByDay[dt]
  }))

  const exportData = {
    exportDate,
    appVersion: APP_VERSION,
    userProfile: {
      heightCm: profile.heightCm,
      weightKg: latestWeightKg,
      age: profile.age,
      gender: profile.gender,
      goal: profile.goal,
      priority: profile.priority
    },
    workoutPlan,
    trainingSessions,
    bodyRecords: bodyRecords.map(r => ({
      date: r.date,
      weightKg: r.weight_kg,
      bmi: r.bmi,
      bodyFat: r.body_fat,
      notes: r.notes
    })),
    aerobicLogs: aerobicLogs.map(r => ({
      type: r.type || 'swim',
      date: r.date,
      distanceM: r.distance_m,
      floors: r.floors,
      distanceKm: r.distance_km,
      durationMin: r.duration_min,
      afterStrength: !!r.after_strength,
      notes: r.notes
    })),
    exerciseDefaults: exerciseDefaults.map(r => ({
      exerciseId: r.exercise_id,
      weightKg: r.weight_kg,
      reps: r.reps,
      seconds: r.seconds,
      targetSets: r.target_sets
    }))
  }

  const json = JSON.stringify(exportData, null, 2)
  const filename = `fitness_export_${todayStr()}.json`

  if (isNative) {
    // 原生端：写入文件并调起系统分享
    // 注意：必须显式传 encoding:'utf8'，否则插件默认按 base64 解码 data，
    // 普通 JSON 文本会被 Base64.decode 判为非法参数（"input parameters aren't valid"）。
    await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    })
    const uri = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache
    })
    await Share.share({
      title: '训练数据导出',
      text: `训练记录导出 ${todayStr()}`,
      url: uri.uri,
      dialogTitle: '分享训练数据'
    })
  } else {
    // Web端：下载文件
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return { filename, size: json.length }
}

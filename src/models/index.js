/**
 * 数据模型定义
 * 对应 SQLite 表结构，与导出 JSON 结构保持一致
 */

// 训练日类型（PPL 三分化）
export const DAY_TYPES = {
  PUSH: 'Push',
  PULL: 'Pull',
  LEGS: 'Legs',
  REST: 'Rest'
}

// 动作分类
export const EXERCISE_CATEGORIES = {
  CHEST: 'chest',      // 胸
  SHOULDER: 'shoulder', // 肩
  BACK: 'back',         // 背
  TRICEPS: 'triceps',   // 三头
  BICEPS: 'biceps',     // 二头
  LEGS: 'legs',         // 腿
  CORE: 'core',         // 核心
  WARMUP: 'warmup'      // 热身
}

export const MUSCLE_GROUP_LABELS = {
  [EXERCISE_CATEGORIES.CHEST]: '胸',
  [EXERCISE_CATEGORIES.SHOULDER]: '肩',
  [EXERCISE_CATEGORIES.BACK]: '背',
  [EXERCISE_CATEGORIES.TRICEPS]: '三头',
  [EXERCISE_CATEGORIES.BICEPS]: '二头',
  [EXERCISE_CATEGORIES.LEGS]: '腿',
  [EXERCISE_CATEGORIES.CORE]: '核心',
  [EXERCISE_CATEGORIES.WARMUP]: '热身'
}

// 一个训练动作
// 对应表 exercises
export class Exercise {
  constructor({
    id,
    name,
    category,
    isMachine = false,
    targetMuscle,
    instructions = '',
    videoUrl = '',
    imageAssetPath = '',
    commonMistakes = '',
    tips = ''
  }) {
    this.id = id
    this.name = name
    this.category = category
    this.isMachine = isMachine
    this.targetMuscle = targetMuscle
    this.instructions = instructions       // 文字步骤说明（必有）
    this.videoUrl = videoUrl               // 视频外链（可选）
    this.imageAssetPath = imageAssetPath   // 本地图片路径（可选）
    this.commonMistakes = commonMistakes   // 常见错误
    this.tips = tips                       // 小贴士
  }
}

// 训练日（Push/Pull/Legs）对应的动作配置
// 对应表 workout_day_exercises
export class WorkoutDayExercise {
  constructor({
    id,
    dayType,
    exerciseId,
    targetSets = 4,
    targetRepsMin = 10,
    targetRepsMax = 12,
    restSeconds = 90,
    sortOrder = 0
  }) {
    this.id = id
    this.dayType = dayType
    this.exerciseId = exerciseId
    this.targetSets = targetSets
    this.targetRepsMin = targetRepsMin
    this.targetRepsMax = targetRepsMax
    this.restSeconds = restSeconds
    this.sortOrder = sortOrder
  }
}

// 一次训练记录（某天某动作的一组）
// 对应表 training_logs
export class TrainingLog {
  constructor({
    id,
    date,
    dayType,
    exerciseId,
    exerciseName,
    setNumber,
    weightKg = 0,
    reps = 0,
    done = false
  }) {
    this.id = id
    this.date = date          // YYYY-MM-DD
    this.dayType = dayType
    this.exerciseId = exerciseId
    this.exerciseName = exerciseName
    this.setNumber = setNumber
    this.weightKg = weightKg
    this.reps = reps
    this.done = done
  }
}

// 身体数据记录
// 对应表 body_records
export class BodyRecord {
  constructor({ id, date, weightKg, bmi, bodyFat = null, notes = '' }) {
    this.id = id
    this.date = date
    this.weightKg = weightKg
    this.bmi = bmi
    this.bodyFat = bodyFat
    this.notes = notes
  }
}

// 有氧记录（type: 'swim' 游泳 / 'stair' 爬楼机 / 'treadmill' 跑步机 / 'bike' 动感单车）
// 对应表 aerobic_logs
export class AerobicLog {
  constructor({ id, type = 'swim', date, distanceM = 0, floors = 0, distanceKm = 0, durationMin, afterStrength = false, notes = '' }) {
    this.id = id
    this.type = type
    this.date = date
    this.distanceM = distanceM  // 游泳：米
    this.floors = floors        // 历史层数（stair 1.0.1 起改公里，仅旧数据保留）
    this.distanceKm = distanceKm  // 爬楼机/跑步机/动感单车：千米
    this.durationMin = durationMin
    this.afterStrength = afterStrength  // 是否在力量后
    this.notes = notes
  }
}

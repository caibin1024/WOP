/**
 * 动作分类与肌群标签
 * 供动作库 / 选动作面板 / 动作详情页使用。
 */

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

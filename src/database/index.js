/**
 * 数据库服务层
 * 基于 @capacitor-community/sqlite
 * 原生端: SQLite 原生库
 * Web端(开发): WASM 版本（需要 jeep-sqlite）
 */
import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { seedWorkoutDayExercises } from './seed'

const DB_NAME = 'fitness_db'
let sqlite = null
let db = null
let isInitialized = false

const isNative = Capacitor.isNativePlatform()

// 建表 SQL
const SCHEMA = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_machine INTEGER DEFAULT 0,
  target_muscle TEXT,
  instructions TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  image_asset_path TEXT DEFAULT '',
  common_mistakes TEXT DEFAULT '',
  tips TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS workout_day_exercises (
  id TEXT PRIMARY KEY,
  day_type TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  target_sets INTEGER DEFAULT 4,
  target_reps_min INTEGER DEFAULT 10,
  target_reps_max INTEGER DEFAULT 12,
  rest_seconds INTEGER DEFAULT 90,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS training_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  day_type TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  done INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_logs_date ON training_logs(date);

-- 训练中途草稿（临时库）：今日页未点"完成"前每组输入/标记状态落盘，防止闪退丢失。
-- 点击"完成今日训练"后按 date 清空；跨天自动失效。
CREATE TABLE IF NOT EXISTS training_draft (
  date TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight_kg REAL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  done INTEGER DEFAULT 0,
  PRIMARY KEY (date, exercise_id, set_number)
);

CREATE TABLE IF NOT EXISTS body_records (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  weight_kg REAL NOT NULL,
  bmi REAL NOT NULL,
  body_fat REAL,
  notes TEXT DEFAULT ''
);

-- 有氧模块统一表：type 区分 swim（distance_m 米）/ stair（floors 层）/ treadmill（distance_km 千米）
CREATE TABLE IF NOT EXISTS aerobic_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'swim',
  date TEXT NOT NULL,
  distance_m INTEGER DEFAULT 0,
  floors INTEGER DEFAULT 0,
  distance_km REAL DEFAULT 0,
  duration_min INTEGER NOT NULL,
  after_strength INTEGER DEFAULT 0,
  notes TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS exercise_defaults (
  exercise_id TEXT PRIMARY KEY,
  weight_kg REAL,
  reps INTEGER,
  seconds INTEGER,
  target_sets INTEGER,
  updated_at TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

-- AI 咨询历史：问题 + 分析时间范围 + DeepSeek 返回结果（v0.2.6 起不再展示，保留数据）
CREATE TABLE IF NOT EXISTS ai_consultations (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  question TEXT DEFAULT '',
  range_label TEXT DEFAULT '',
  result TEXT DEFAULT '',
  created_at TEXT DEFAULT ''
);

-- AI 会话消息（v0.2.6 持续会话）：seq 保证顺序，kind 分类（init/data/ask/preset/reply/summary）
CREATE TABLE IF NOT EXISTS ai_messages (
  id TEXT PRIMARY KEY,
  seq INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  kind TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_seq ON ai_messages(seq);
`

async function initWebSqlite() {
  // Web 端需要 jeep-sqlite 组件
  const { defineCustomElements } = await import('jeep-sqlite/loader')
  await defineCustomElements(window)
  await customElements.whenDefined('jeep-sqlite')
  await sqlite.initWebStore()
}

let dbInitPromise = null

/**
 * 初始化数据库连接
 * 并发安全：多个调用方同时 init 时共享同一个 Promise（只 createConnection/open 一次），
 * 避免重复打开同一 DB 打坏共享 db 引用（设置页等会并发触发 training/profile/body 三个 store）。
 */
export async function initDatabase() {
  if (isInitialized) return db
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      sqlite = new SQLiteConnection(CapacitorSQLite)
      if (!isNative) {
        await initWebSqlite()
      }

      db = await sqlite.createConnection(
        DB_NAME,
        false,       // encrypted
        'no-encryption',
        1            // version
      )
      await db.open()

      // 迁移：有氧模块（v0.1.21）— 老库 swim_logs 改名 aerobic_logs 并补 type/floors 列。
      // 必须在建表前执行：SCHEMA 的 CREATE IF NOT EXISTS aerobic_logs 若先建出空表，
      // 会把老数据困在 swim_logs；先改名可让老记录无缝继承（type 默认 'swim'）。
      const swimTables = await db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='swim_logs'"
      )
      if (swimTables.values?.length) {
        await db.run('ALTER TABLE swim_logs RENAME TO aerobic_logs')
        await db.run("ALTER TABLE aerobic_logs ADD COLUMN type TEXT NOT NULL DEFAULT 'swim'")
        await db.run('ALTER TABLE aerobic_logs ADD COLUMN floors INTEGER NOT NULL DEFAULT 0')
      }

      // 执行建表
      const statements = SCHEMA
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const statement of statements) {
        await db.execute(statement)
      }

      // 迁移：exercise_defaults 增加 target_sets 列（老库升级，列不存在时补）。
      // 手动加组后"默认新组数"，动作库配置里也要有组数。
      const defCols = await db.query('PRAGMA table_info(exercise_defaults)')
      const hasTargetSets = (defCols.values || []).some(c => c.name === 'target_sets')
      if (!hasTargetSets) {
        await db.run('ALTER TABLE exercise_defaults ADD COLUMN target_sets INTEGER')
      }

      // 迁移：aerobic_logs 增加 distance_km 列（跑步机，v0.2.4；老库升级时补列）。
      const aeroCols = await db.query('PRAGMA table_info(aerobic_logs)')
      const hasDistanceKm = (aeroCols.values || []).some(c => c.name === 'distance_km')
      if (!hasDistanceKm) {
        await db.run('ALTER TABLE aerobic_logs ADD COLUMN distance_km REAL DEFAULT 0')
      }

      // 迁移：AI 增量上传水位（v0.2.6）——训练日志/身体数据/有氧记录各加 ai_uploaded 列，
      // 标记哪些行已上传给 AI 会话，只传新增（老库升级时补列，默认 0=未上传）。
      for (const table of ['training_logs', 'body_records', 'aerobic_logs']) {
        const aiCols = await db.query(`PRAGMA table_info(${table})`)
        if (!(aiCols.values || []).some(c => c.name === 'ai_uploaded')) {
          await db.run(`ALTER TABLE ${table} ADD COLUMN ai_uploaded INTEGER NOT NULL DEFAULT 0`)
        }
      }

      // 首次初始化：把预置计划写入 workout_day_exercises（表空才写入）。
      // 此后计划以表为准，支持设置页自定义。必须用本地 db 对象（重入陷阱）。
      await seedWorkoutDayExercises(db)

      // 默认计划偏移：练三休一顺延 1 天（今天 8/11 为休息日，明天恢复 Push）。
      // 注意：此处必须用本地 db 对象，不能调模块级 run()（会重入 initDatabase）。
      await db.run(
        "INSERT OR IGNORE INTO app_meta (key, value) VALUES ('schedule_offset_days', '1')",
        []
      )
      // 漏练判断起始日：默认=首次使用（安装后）当天。早于此日期的历史日期不标"漏练"。
      await db.run(
        "INSERT OR IGNORE INTO app_meta (key, value) VALUES ('miss_start_date', ?)",
        [todayStr()]
      )
      // 个人资料默认值：设置页可编辑，导出数据读取真实值。仅首次安装写入，已有值不受影响。
      const PROFILE_DEFAULTS = [
        ['profile_height_cm', '172'],
        ['profile_age', '28'],
        ['profile_gender', 'male'],
        ['profile_goal', '综合增肌减脂'],
        ['profile_priority', '肩>胸>背>腹']
      ]
      for (const [key, value] of PROFILE_DEFAULTS) {
        await db.run("INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)", [key, value])
      }

      isInitialized = true
      return db
    })()
    // 并发调用共享同一 Promise；若初始化失败则重置，下次调用可重试
    dbInitPromise.catch(() => { dbInitPromise = null })
  }
  return dbInitPromise
}

/**
 * 通用查询：返回行数组
 */
export async function query(sql, values = []) {
  const db = await initDatabase()
  const res = await db.query(sql, values)
  return res.values || []
}

/**
 * 通用执行（INSERT/UPDATE/DELETE）
 */
export async function run(sql, values = []) {
  const db = await initDatabase()
  const res = await db.run(sql, values)
  return res.changes || 0
}

/**
 * 生成简单唯一 ID
 */
export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 今日日期 YYYY-MM-DD
 */
export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

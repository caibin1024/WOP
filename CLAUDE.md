# CLAUDE.md — WOP 健身 App 项目须知

> 供 AI 助手（及新接手的人）快速上手。改代码前请先读完「已知坑与地雷」一节。
> 最后更新：2026-10-13（v1.3.0：自增动作库 + 可配置训练周期 + 训练日志补录；2026-09-30 含 v1.2.0 未发版修复：web 端 jeep-sqlite 初始化）

## 项目是什么

个人自用的健身训练 App（中文界面，**单用户、无后端、无云端**）。PPL 循环训练（周期可配置，默认练三休一）+ 有氧打卡 + AI 教练咨询（DeepSeek / 小米 Token Plan 双供应商可切换）。目标设备是用户自己的小米手机，仅内部分发，不上应用商店。

- 包名 `com.xdw.fitness`，应用名 `WOP`
- 所有数据存在本机 SQLite，**不上云**；导出 JSON 也不含 AI Key / 会话 / 记忆

## 文档同步义务（硬要求，用户明确要求）

改动代码后**必须顺手同步更新这两份文档**，不要留到"以后再说"：

| 文档 | 什么时候要更新 |
|---|---|
| `README.md` | **用户可见事实**变化时：功能、页面、动作数量、有氧类型、构建/发版命令、数据与隐私说明 |
| 本文件 `CLAUDE.md` | **开发相关知识**变化时：架构约定、数据库表/迁移、构建流程、坑清单、待办列表 |

判据很简单——**文档写的和代码做的不一致，就是 bug**。改动收尾前先过一遍这两份文件，宁可先更新文档再结束任务。待办项完成后记得从「待办 / 已知未修」里勾掉。

## 技术栈

- **前端**：Vue 3（`<script setup>` 语法）+ Pinia + vue-router 4（**hash 模式**）+ Vite 8
- **移动端**：Capacitor 8（Android），minSdk 24 / compileSdk & targetSdk 36
- **数据库**：`@capacitor-community/sqlite`（Android 走原生 SQLite；Web 开发时走 jeep-sqlite WASM）
- **AI**：DeepSeek / 小米 Token Plan 两家 OpenAI 兼容 `chat/completions`（非流式）。URL/模型/品牌文案集中在 `aiCoach.js` 的 `AI_PROVIDERS` 配置表，**UI 不展示、不可改**。原生端用 `CapacitorHttp`（绕过 WebView CORS），Web 端 dev 走 Vite 代理 `/deepseek` 与 `/mimo`（**都必须配 `rewrite`**，见坑清单）

## 常用命令

```bash
npm run dev          # Vite 开发服务器（Web 端，可调 UI；AI 走 Vite 代理）
npm run build        # 生产构建 → dist/
```

### 完整发版流程（照抄，顺序不能变）

```bash
# 1. 改版本号（见下节，三处都要改）
# 2. 构建 web 资源
npm run build
# 3. 把 dist 拷进 Android 工程（缺这步 gradle 会装出旧界面！）
npx cap copy android
# 4. 打 APK（需要 Java 21）
cd android && JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot" \
  ANDROID_HOME="C:/Android" ./gradlew assembleDebug
# 5. 产物重命名到项目根目录
cp android/app/build/outputs/apk/debug/app-debug.apk WOP-v<版本号>.apk
```

- 产物路径：`android/app/build/outputs/apk/debug/app-debug.apk`
- 历史 APK 全部堆在项目根目录（`WOP-v0.1.0.apk` … ），这是有意的，保留回溯
- **没有测试框架**。改完的验证方式只有两个：`npm run build` 看是否编译通过 + 装到真机上手测。因此改动要尽量小、可回滚

## 版本号规则（三处必须同步，漏一处就出问题）

| 文件 | 字段 |
|---|---|
| `src/version.js` | `APP_VERSION`（唯一版本源，导出 JSON 里也用它） |
| `package.json` | `version` |
| `android/app/build.gradle` | `versionCode`（**每次 +1**）、`versionName` |

- 补丁号 +1 为常规发布；大功能/里程碑升 `0.x.0` 或 `x.0.0`
- APK 文件名约定 `WOP-v{APP_VERSION}.apk`
- **versionCode 只能增不能减**：Android 不允许降级安装，想退回旧版必须卸载重装 → 本机数据全丢

## 目录结构

```
src/
  views/        页面：Today / History(+Detail) / ExerciseList(+Detail) / Aerobic / Body / Settings / AiConsult
  components/   AppIcon、BackLayer、CalendarCard、ExercisePickerSheet、ExerciseFormSheet、CycleEditorSheet、ProgressChart
  stores/       Pinia：training / aerobic / body / profile / ai / theme
  database/     index.js（建表 + 迁移 + query/run）、seed.js（动作库 + 预置计划 + 调度算法）
  services/     aiCoach.js（提示词 + 双供应商调用，`AI_PROVIDERS` 配置表）、exportData.js、importData.js
  composables/  useBackStack.js（返回栈）
  models/       index.js（仅剩 EXERCISE_CATEGORIES / MUSCLE_GROUP_LABELS 等常量）
android/        Capacitor Android 工程（MainActivity.java 之外基本不用动）
```

**无入口的后端**：所有"服务端逻辑"都在前端 + SQLite 里。没有 API 服务器。

## 数据库

库名 `fitness_db`。核心表：

| 表 | 用途 |
|---|---|
| `exercises` | **自定义动作表（v1.3.0 启用，曾是死表）**：内置 44 个动作仍在 `seed.js` 的 `SEED_EXERCISES` 内存里，此表只存用户自增的动作——**表里有 = 自定义，无标志位**。含 `recommended_weight_kg` / `recommended_seconds` / `special` 三列（SCHEMA + PRAGMA 缺列 ALTER 双路径）。加载入口唯一：`training.loadCustomExercises()` → `allExercises = [...SEED, ...rows]` |
| `workout_day_exercises` | **计划动作配置（唯一数据源）**，设置页可换/增删/排序 |
| `training_logs` | 训练记录，`reps` 列对计时动作（平板支撑等）存的是**秒数** |
| `training_draft` | 今日页未点"完成"前的草稿，防闪退丢输入 |
| `body_records` | 体重 / BMI / 体脂 |
| `aerobic_logs` | 有氧，`type` ∈ `swim` / `stair` / `treadmill` / `bike` |
| `exercise_defaults` | 每个动作的默认重量/次数/秒数/组数 |
| `app_meta` | 键值表：计划偏移（`schedule_offset_days` 基线）、顺延时间线（`schedule_changes`）、顺延撤销快照栈（`schedule_changes_undo`）、**训练周期（`schedule_cycle`，JSON 数组，v1.3.0——与 `ai_provider` 同为"读默认值"语义：读不到/`isValidScheduleCycle` 不过就当默认 4 槽，零迁移）**、漏练起始日、个人资料、AI 供应商选择（`ai_provider`）、两把 AI Key（`deepseek_api_key` / `mimo_api_key`）、AI 长期记忆、迁移标记。**AI 这三键是"读默认值"语义（读不到 `ai_provider` 就当 deepseek），无迁移** |
| `ai_messages` | AI 会话滚动窗口 |
| `ai_consult_records` | AI 咨询记录列表（独立于会话，折叠记忆时不丢） |

### 迁移铁律

1. **迁移必须只跑一次**，用 `app_meta` 里的标记键守卫（如 `migration_plan_boost_v1`）。
   **绝对不要**用"表里有没有这条数据"来判断要不要补——用户主动删除后会被当成"缺失"补回来。
   （历史上真出过这个 bug：设置页删掉的动作每次启动又出现。）
2. 加列用 `PRAGMA table_info` 检查后 `ALTER TABLE ADD COLUMN`（见 `initDatabase` 既有写法）。
3. `initDatabase()` 有 `isInitialized` 短路 + `dbInitPromise` 并发去重，**首次会话才跑建表和迁移**。
4. 建表/迁移内部必须用**本地 `db` 对象**（`db.run(...)`），不能调模块级 `run()`——会重入 `initDatabase`。

## AI 教练模块（三层记忆，v1.1.0 起）

解决"长会话丢失早期上下文"的问题，替代了旧的递归摘要方案：

1. **长期记忆**：`app_meta` → `ai_memory`，AI 增量维护的要点档案（目标/伤病史/动作趋势/历史结论）。有新增才更新，**合并**而非重新压缩，避免早期信息被反复稀释
2. **数据概览**：每次提问前本地 SQL 现算（今日计划 / 各动作 PR / 体重走势 / 有氧累计），动态注入。数字永远实时，不依赖 AI"记住"
3. **滚动窗口**：`ai_messages` 只保留最近 `MEMORY_WINDOW_SIZE`(30) 条真实对话，更早的折叠进长期记忆

请求组装顺序（`sendRequest`）：`system(含记忆) → 初始上下文(个人资料) → 数据概览 → 滚动窗口 → 增量数据 → 用户提问`

其他要点：

- 「新建会话」（`createConversation()`）会清空 `ai_messages` + `ai_consult_records` + `ai_memory`，并重置三张表的 `ai_uploaded=0`
- 增量上传靠各表的 `ai_uploaded` 水位列，只传新增行
- **记忆折叠失败不能阻断咨询**：`maintainMemory()` 在 `sendRequest` 里被 try/catch 包住，静默跳过
- 记忆维护用独立的 `MEMORY_SYSTEM_PROMPT`（不是教练角色），且 `maxTokens` 要够大（2000 中文字符 ≈ 4000 token）
- **`SYSTEM_PROMPT` 是模块级静态常量（v1.3.0），带不了动态配置**：那段周期描述必须保持**周期中立**（"以【训练周期】为准"），真实周期序列由 `buildInitialContext`（建会话，需先 `try { await training.init() }`）与 `buildDataOverview`（每次问答）现算注入。改周期相关文案只动这两处 + 中立表述，别往 SYSTEM_PROMPT 里写具体序列

### 供应商切换（v1.2.0 起，双供应商）

- 设置页分段切换 DeepSeek / 小米 Token Plan；选择存 `app_meta.ai_provider`，**读不到默认 deepseek**（老用户无感，故无需迁移）
- 两把 key 各存各的：键名按 `` `${provider}_api_key` `` 推导（`deepseek_api_key` 键名未动），来回切换互不覆盖
- URL/模型/占位符/错误文案品牌全在 `aiCoach.js` 的 `AI_PROVIDERS` 表；**UI 只拿 label，不 import 配置表**（SettingsView 用本地 `PROVIDER_OPTIONS`，镜像 `THEME_OPTIONS` 范式）
- `callAI({ provider, apiKey, ... })` 按调用点取配置；provider/apiKey 是调用时按值捕获的，切换瞬间的在途请求以旧供应商自然完成，无竞态
- **切换不清会话 / 记忆 / `ai_uploaded` 水位**：两家同为 OpenAI 兼容，历史消息可续读；想干净由用户手动「新建会话」
- 设置页切换时 `keyInput` 必须重同步 `ai.apiKey`——不同步会把 A 家的 key 显示进 B 家输入框，一点保存就串键（代价是丢 A 家未保存草稿，正确性优先）

## 已知坑与地雷（改代码前必读）

### 数据库 / SQLite

- **`run()` 不能在事务里嵌套**：插件原生实现里 `run(transaction=true)` 自己 `beginTransaction`，且 finally 中只要事务仍活跃就**无条件 `rollbackTransaction()`**——嵌在外层事务里会把整个外层事务回滚掉。
  **事务体内必须用 `runInTransaction()`**（内部传 `transaction=false`），配 `withTransaction(fn)` 使用。
- **`IN (...)` 批量操作要分批**：SQLite 有参数上限，代码里统一 500 一批（见 `markUploaded`）。
- **SCHEMA 按半角分号拆分执行，SCHEMA 注释里不能出现半角分号**（`--` 注释一样会被 split 切断，后半句会被当成独立语句执行报错）。表/列级注释写在 SCHEMA 外的普通注释里。
- **Web 端"数据全空" ≠ 数据丢了，先查 jeep-sqlite 两件套**（2026-09-30 真实踩坑：web 测试版连预置计划都没有、刷新无效）：
  ① `initWebSqlite` 必须把 `<jeep-sqlite>` **插进 DOM**——插件 `initWebStore` 是用 `querySelector` 取实例的，只 `defineCustomElements` 注册标签会抛 "element is not present in the DOM"；
  ② `public/assets/sql-wasm.wasm` 必须存在，**且必须是 jeep-sqlite 构建时锁定的 sql.js 版本**——包本身不带 wasm（只在构建时拷进未发布的 `www/assets`），但 emscripten 胶水已**内置死**在 `dist/esm` 里：拿本项目 `node_modules/sql.js` 的 wasm（依赖声明 `^1.11.0`，实际会被解析到最新 1.14.1）会报 `LinkError: Import #34 ... requires a callable`，页面卡"加载中"。
  缺任一个或版本不配 → `initDatabase` 全程走不通 → 所有 store 加载失败 → 页面表现像"什么数据都没有"或一直加载中，**其实手机端和浏览器存量数据都完好**。**jeep-sqlite 2.8.0 配 `sql.js@1.11.0`**（其 gitHead 的 package-lock 实证；1.11.0 的 wasm 已拷入 `public/assets/` 并随仓库提交，别用 `npm update` 后的新版覆盖）。该 wasm 会随 dist 进 APK（native 原生 SQLite 根本不加载它，纯死重，暂不处理）。

### Capacitor / Android

- **改完前端必须 `npx cap copy android`**，否则 gradle 报 `up-to-date` 但装出来的还是旧界面。
- **构建需要 Java 21**（Capacitor 8 要求）。`JAVA_HOME` 指向 `jdk-21.0.12.101-hotspot`，`ANDROID_HOME=C:/Android`。
- **覆盖安装保留数据**，卸载重装会清空本机所有数据（含 AI 会话与长期记忆，且导出文件恢复不了 AI 部分）。

### AI / 网络

- **`CapacitorHttp` 在 Android 上必须显式带 `Content-Type: application/json`**，否则 OkHttp 的 `setRequestBody()` 直接返回、请求体根本不发送（DeepSeek 会返回 400 或空响应）。
- **4xx/5xx 时 `CapacitorHttp` 是 resolve 而不是 reject**，必须按 `res.status` 分支处理，不能只 try/catch。
- **Vite 代理必须配 `rewrite`**：`/deepseek` 剥前缀 → `/chat/completions`，`/mimo` 剥前缀补 `/v1` → `/v1/chat/completions`。缺 rewrite 会把本地前缀原样前转到真实域名（如 `api.deepseek.com/deepseek/...`）变成 404。这是 web-dev 独有的坑，原生 CapacitorHttp 直连不走代理。历史上下文：`/deepseek` 条目最初就漏了 rewrite。

### 业务逻辑

- **顺延（`postponeSchedule`）是"插入一个休息日"语义，不是"偏移整体 +1"**。
  偏移 +1 只让每一天取到它"前一天"的日型：若插入日前一天是训练日（昨天刚练 Push），插入日会变成 Push——用户等于重练一天，真正该练的日型被顶掉。所以插入日要按 `rest` 的下标反推偏移增量，显式锁成休息日。
  写入的是两条 change point：`{插入日: base + restShift}` + `{插入日+1: base + 1}`（次日起整体后移 1 天）。
- **顺延的插入日不是"顺延起点"**，而是起点起**第一个非 rest 的日期**（见 `postponeInsertDate`）。起点本来就轮空、或当天已顺延过一次时，在起点插入没有意义（后移量与文案对不上，还会反复叠 change point 把后续日型相位带偏）。UI 文案必须跟着 `postponeInsertDate` 走，别用 `postponeStartDate`。
- **撤销顺延靠 `schedule_changes_undo` 快照栈**，不要改成"弹掉末尾两条 change point"：连续顺延时，下一次的插入日会覆盖上一版写入的 change point，时间线本身已无法还原上一版排期。
- **`profile.load()` 不能加空载短路**（`if (loaded.value) return`）。`SettingsView.vue` 在**导入数据后**需要它强制重读 `app_meta`，把页面上的身高/年龄/目标刷新成导入文件里的新值；加短路会导致"导入后资料不刷新"。
- **计时动作（`special === 'seconds'`）的 `reps` 列存的是秒数**。判断动作是否计时统一用 `seed.js` 导出的 `TIMED_EXERCISE_IDS`，不要各处自己 filter 一遍。该 Set **保持对象导出**、内容由 `syncTimedExerciseIds(all)` 原地重建（`loadCustomExercises` 驱动）——消费方 `.has(id)` 才能零改动。
- **顺延的 restShift 必须算术取下标**（v1.3.0 周期可含重复日型）：`idx = getCycleIndex(date, base, cycle)`、`restShift = ((idx - restIdx) % n + n) % n`，`restIdx = cycle.indexOf('rest')`。**不能用 `indexOf(日型)` 取 idx**——重复类型下返回第一个出现位，restShift 算错、插入日锁不成休。
- **改周期 = 重置顺延，三键必须同事务**（`setScheduleCycle`）：一个事务里写 `schedule_cycle` + 清 `schedule_changes` + 清 `schedule_changes_undo`。旧时间线的整数偏移是按旧周期长度换算的，新周期下会被重新解释（未执行过去日期日型追溯改写、顺延点错位）。已执行日靠 training_logs 覆盖不受影响；过去无记录日期日型会变是**拍板接受的取舍**，确认框带"保存后今天将变为 X"预览（`previewTodayDayType`）。
- **导入的计时判定用本地并集**：`importData` 里 `timedIds = 新 Set(TIMED_EXERCISE_IDS) ∪ 文件内计时动作`——**不能在事务里动全局 `TIMED_EXERCISE_IDS`**（回滚会让集合残留已删动作的幽灵 id，秒数会被后续会话当次数导入）。全局同步交给导入成功后的 `loadCustomExercises`。
- **删除计时自定义动作后，历史记录按次数显示**：`special` 随动作行一起没了，`reps` 里的秒数只能当次数展示。记录本身不碰（`exercise_name` 快照保留），删除确认文案已警示——已知取舍，别"顺手修"。
- **补录组号 = MAX+1 追加式，不回填空洞**（`addLogSet` / 今日页 `addSet` 一致）：`training_logs` 无 `UNIQUE(date, exercise_id, set_number)` 约束，填洞没有防冲突兜底；组号只是展示序号，不影响任何统计。组号从 `historyByDate` 内存算（与详情页 groups 同源），**别改成 SQL 现查**——LIMIT 3000 窗口外的日期页面本身进不去，现查会算出页面看不到的组号。
- **`addLogSet` 只做参数推导（组号/日型/动作名快照），执行复用 `logSet`**：INSERT 与"今日 `loadTodayLogs`、总是 `loadHistory`"的重载语义只此一份，别在两处复制分叉。补录今天会推高 `hasTodayLog` → 今日页切完成态、`saveAllToday` 不可达，两者**结构性互斥**，组号不可能冲突（详情页补录入口与今日页归档的先后两条路径都论证过）。
- **历史详情页补录的新建态用 `'new:'+exerciseId` 哨兵写进 `editingId`**：单变量保证「行内编辑」与「补录行」结构性互斥，且现有 `BackLayer(show="editingId !== ''")` 天然覆盖新建行——别另开一个状态变量。动作级合成卡片（`logs:[]`）的 `name` 必须走 `?.` 兜底链，换动作按钮对 0 组隐藏，`openSwapPicker` 开头要取消 pending 新建态（防批量换 id 后卡片错位）。
- `wde.special` 不存在，只有 `wde.exercise.special`——别写错层级。

### 前端 / Vue

- **模板里只能引用 store 已经 `return` 出去的属性**。引用未导出的属性构建期不报错（生产模式静默返回 `undefined`），但一旦取它的子属性（`.length` 之类）就会在渲染时抛错；**而 `CalendarCard.vue` 的日历网格和底部弹窗属于同一个组件、同一个 render 函数 —— 弹窗模板抛错，整块日历卡片一起消失**（历史上真发生过：长按日历后整个日历组件不见了，只剩训练记录）。改 store 的导出面时务必同步检查模板；往这个弹窗里加东西要格外保守（只引用已导出属性、别写复杂表达式）。

### 工具链

- **数行号要用 UTF-8 读文件**。PowerShell 5.1 的 `Get-Content` / `Select-String` 默认按 GBK 解码无 BOM 的 UTF-8 源码，中文注释里的三字节序列会吞掉换行符，导致行号偏小、定位到错误的代码。

## 风格约定

- 注释、UI 文案、提交信息一律**简体中文**
- 注释写**为什么**（尤其是反直觉的取舍、踩过的坑），不写"做了什么"——代码本身能说明
- 该文件之外的改动尽量小步、可回滚；没有测试兜底，宁可保守
- 用户会自己真机试用后反馈，不要主动加没被要求的功能

## 待办 / 已知未修

（暂无）

> 已修（v1.3.0）：`exercises` 表已启用为自定义动作存储（自增动作库），不再是死表；`confirmClear` 也**不清**它（自定义动作 = 配置，清了会造孤儿计划槽位）。
> 已修（v1.1.2）：`confirmClear()` 现在会连带删掉 `app_meta` 的 `ai_memory`。
> 注意「清空全部数据」**不清** `app_meta`：顺延时间线 / 撤销快照 / 漏练起始日 / 计划偏移 / 训练周期都属于排期配置，不在清理范围内（与既有行为一致）。

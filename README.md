# WOP 健身计划 App

个人自用的健身训练 App（中文界面，Android）。**练三休一 PPL 循环训练** + 有氧打卡 + 身体数据 + AI 教练咨询（DeepSeek / 小米 Token Plan 可切换）。

- **单用户、无后端、无云同步**：所有数据存在手机本机 SQLite，不上传任何服务器（AI 咨询除外，见「数据与隐私」）
- 定位是自用工具，不发布应用商店，按需打 APK 装到自己手机上

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vue 3（`<script setup>`）+ Pinia + vue-router 4（hash 模式）+ Vite 8 |
| 移动端 | Capacitor 8（Android，minSdk 24 / targetSdk 36） |
| 数据库 | `@capacitor-community/sqlite`（原生 SQLite；Web 开发时走 jeep-sqlite WASM） |
| AI | DeepSeek / 小米 Token Plan `chat/completions`（非流式，设置页切换） |

## 功能

### 今日训练
按练三休一循环（Push 推日 → Pull 拉日 → Legs 腿核日 → 休息日）自动算出今天该练什么，逐组记录重量 / 次数。支持手动加组、长按删组，输入内容实时落草稿库防闪退丢失，点「完成今日训练」后归档。休息日提示做有氧。

### 训练记录
日历视图标注每天的计划类型与是否如期训练，标出「漏练」日期。点某天可下钻到训练明细，支持编辑 / 删除单组记录、整组更换动作。

停练时可「顺延」：在你停练的那天（若那天本来就轮空，则顺到下一个训练日）插入一个休息日，该日原有的训练日型及之后排期整体后移 1 天。只影响该日及之后的排期，已完成的训练记录不受影响；顺延可以撤销。

### 动作库
**44 个动作**，按肌群分类（胸 / 肩 / 背 / 三头 / 二头 / 腿 / 核心 / 热身），每个动作有完整中文教学：步骤、常见错误、小贴士。点进详情可看该动作的历史最佳重量与进度曲线。

### 有氧
四类打卡：**游泳**（米）/ **爬楼机** / **跑步机** / **动感单车**（公里），可按类型查看累计距离与次数。

### 身体数据
记录体重 / 体脂，自动算 BMI，看体重走势。

### AI 教练
在 **DeepSeek 与小米 Token Plan 之间切换**，进行**持续对话**（会话长期保留，不是一次性问答），可用三个一键预设：**综合分析** / **今日建议** / **今日总结**。

采用**三层记忆**架构解决长会话丢失早期上下文的问题：

1. **长期记忆**——AI 增量维护的要点档案（你的目标、伤病史、各动作表现趋势、历史结论），随对话逐步积累，早期关键信息不会被反复压缩稀释
2. **数据概览**——每次提问前本地 SQL 现算（今日计划 / 各动作历史最佳 / 体重走势 / 有氧累计）动态注入，引用的数字永远实时准确
3. **滚动窗口**——只保留最近 30 条对话在上下文里，更早的折叠进长期记忆

需自备所选服务商的 API Key（设置页填写，仅存本机）：DeepSeek 填 `sk-` key，小米 Token Plan 填 `tp-` key——**两家各存各的，来回切换不丢**。选中哪家都只需填 key，接口地址与模型（小米端为 `mimo-v2.6-flash`）已自动内置、无需配置。切换供应商不会清空当前会话与记忆（两家接口兼容，历史可续读）。

### 设置
训练计划自定义（换 / 增删 / 排序动作，配置组数、次数、重量）、训练节奏、AI 服务商切换与 Key、数据导出 / 导入 / 清库、主题外观、个人资料。

## 本地开发

```bash
npm install
npm run dev        # Vite 开发服务器（改 UI 用这个最快）
npm run build      # 生产构建 → dist/
```

Web 端可用于调 UI；原生能力（SQLite 原生库、文件分享等）需装到手机验证。

## 构建 Android APK

需要 **Java 21**（Capacitor 8 要求）与 Android SDK。

```bash
npm run build
npx cap copy android          # 必须：把 dist 拷进 Android 工程，漏了会装出旧界面
cd android && JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot" \
  ANDROID_HOME="C:/Android" ./gradlew assembleDebug
```

产物在 `android/app/build/outputs/apk/debug/app-debug.apk`，按惯例重命名到项目根目录 `WOP-v<版本号>.apk`。

### 发版时版本号三处必须同步

| 文件 | 字段 |
|---|---|
| `src/version.js` | `APP_VERSION`（唯一版本源） |
| `package.json` | `version` |
| `android/app/build.gradle` | `versionCode`（**每次 +1**）、`versionName` |

> ⚠️ `versionCode` 只能增不能减——Android 不允许降级安装，想退回旧版必须卸载重装，会清空本机全部数据。

## 目录结构

```
src/
  views/        页面：Today / History(+Detail) / ExerciseList(+Detail) / Aerobic / Body / AiConsult / Settings
  components/   AppIcon、BackLayer、CalendarCard、ExercisePickerSheet、ProgressChart
  stores/       Pinia：training / aerobic / body / profile / ai / theme
  database/     index.js（建表 + 迁移 + query/run）、seed.js（动作库 + 预置计划 + 训练日算法）
  services/     aiCoach.js（提示词 + DeepSeek 调用）、exportData.js、importData.js
  composables/  useBackStack.js（Android 返回键栈）
android/        Capacitor Android 工程
```

## 数据与隐私

- 训练 / 身体 / 有氧数据、个人资料、AI 会话与记忆**全部存在本机 SQLite**（`fitness_db`），不上云
- 走 AI 咨询时，相关训练数据会作为提示词发送给设置页所选的服务商（DeepSeek / 小米 Token Plan）；API Key 只存本机，不编进 APK
- 导出 JSON 用于备份与迁移，**不含 API Key、AI 会话与长期记忆**
- 数据只在本地意味着：**卸载重装 / 清除应用数据 / 换手机都会丢失全部数据**，且 AI 部分无法通过导出文件恢复

## 深入阅读

开发约定、数据库迁移铁律、AI 模块设计、**踩过的坑清单**（事务嵌套、CapacitorHttp header、构建缓存等）都在 [`CLAUDE.md`](./CLAUDE.md)，改代码前建议先过一遍。

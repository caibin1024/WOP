# WOP 健身计划 App

个人定制的健身训练 App（中文界面），练三休一 PPL 循环训练计划 + 有氧打卡 + AI 教练咨询。

## 技术栈

- **前端**：Vue 3（`<script setup>`）+ Pinia + vue-router 4（hash 模式）+ Vite
- **移动端**：Capacitor 8（Android，目标设备小米 17 Pro Max）
- **数据库**：`@capacitor-community/sqlite`（原生 SQLite，Web 端走 jeep-sqlite WASM）

## 功能

- **今日训练**：按 PPL 计划（Push / Pull / Legs / 休息日）生成每日动作，逐组记录重量 / 次数，中途草稿防丢失，可手动加组 / 长按删组
- **记录**：训练历史概要 + 明细下钻，支持编辑删除；AI 咨询（DeepSeek，按近 7 / 30 / 90 天 / 全部范围分析）
- **动作库**：23 个动作教学（器械 / 自由 / 热身分类）
- **有氧**：游泳 / 爬楼机 / 跑步机三类打卡，统一记录列表按类型标记
- **设置**：训练计划自定义（换 / 增删 / 排序动作，配置组数、次数、重量）、训练节奏、AI Key、数据导出 / 清库
- 练三休一 PPL 循环自动顺延，漏练标记，身体数据记录与 BMI 计算

## 本地开发

```bash
npm install
npm run dev        # Vite 开发服务器
npm run build      # 生产构建
```

## 构建 Android APK

```bash
npm run build
npx cap sync android
cd android && JAVA_HOME="<JDK路径>" ./gradlew assembleDebug
```

## 目录结构

- `src/views/` — 页面（今日 / 记录 / 动作库 / 有氧 / 个人 / 设置）
- `src/stores/` — Pinia stores（training / aerobic / body / profile / ai）
- `src/database/` — SQLite 建表与迁移、计划种子数据
- `src/services/` — AI 教练（DeepSeek）、数据导出
- `src/components/` — 通用组件（AppIcon、选动作面板、AI 面板等）

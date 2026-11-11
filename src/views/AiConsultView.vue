<template>
  <div class="ai-page">
    <header class="page-header ai-header">
      <div>
        <h1 class="ai-title"><AppIcon name="sparkles" :size="20" /> 训练分析</h1>
        <div class="subtitle">带记忆的持续会话 · {{ ai.providerLabel }}</div>
      </div>
    </header>

    <div class="ai-body">
      <!-- 未配置 Key -->
      <div v-if="!ai.hasApiKey" class="ai-empty">
        <AppIcon name="sparkles" :size="40" style="color: var(--text-tertiary)" />
        <p class="ai-empty-title">尚未配置 {{ ai.providerLabel }} API Key</p>
        <p class="ai-hint">请到「设置 → 训练分析」填写你的 API Key，即可开始与 AI 教练对话。</p>
        <button class="btn btn-primary" @click="goSettings">
          去设置配置
          <AppIcon name="arrow-right" :size="18" />
        </button>
      </div>

      <!-- 尚未有记录 -->
      <div v-else-if="!ai.records.length" class="ai-empty">
        <AppIcon name="sparkles" :size="40" style="color: var(--text-tertiary)" />
        <p class="ai-empty-title">还没有咨询记录</p>
        <p class="ai-hint">在下方输入问题或点击一键咨询，AI 会结合你的训练数据作答；首次使用会自动建立带记忆的会话。</p>
      </div>

      <!-- 咨询记录列表 -->
      <div v-else ref="listEl" class="ai-list">
        <div v-for="r in ai.records" :key="r.id" class="record-card" @click="openReply(r)">
          <div class="record-row">
            <AppIcon :name="recordIcon(r)" :size="16" class="record-icon" />
            <span class="record-title">{{ r.title }}</span>
            <AppIcon name="chevron-right" :size="16" class="record-arrow" />
          </div>
          <div class="record-time">{{ fmtTime(r.createdAt) }}</div>
        </div>
      </div>

      <!-- 错误（各状态通用） -->
      <div v-if="errorMsg" class="ai-error">
        <span>{{ errorMsg }}</span>
      </div>
    </div>

    <!-- 一行三个一键咨询按钮（输入框上方） -->
    <div class="ai-presets">
      <button class="ai-preset-btn" :disabled="!canUse" @click="runPreset('comprehensive')">
        <AppIcon name="chart" :size="16" class="preset-icon" />
        <span>综合分析</span>
      </button>
      <button class="ai-preset-btn" :disabled="!canUse" @click="runPreset('advice')">
        <AppIcon name="dumbbell" :size="16" class="preset-icon" />
        <span>今日建议</span>
      </button>
      <button class="ai-preset-btn" :disabled="!canUse" @click="runPreset('summary')">
        <AppIcon name="check" :size="16" class="preset-icon" />
        <span>今日总结</span>
      </button>
    </div>

    <!-- 思考中提示 -->
    <div v-if="ai.isLoading" class="ai-loading-note">AI 正在思考，请稍候…</div>

    <!-- 输入 + 圆形发送按钮 -->
    <div class="ai-composer">
      <textarea
        v-model="question"
        class="ai-input"
        rows="1"
        placeholder="输入你的问题，如「今天肩部练得怎么样？」"
        :disabled="!canUse"
        @keydown.enter.exact.prevent="send"
      ></textarea>
      <button class="ai-send" :disabled="!canUse || !question.trim()" @click="send" aria-label="发送">
        <AppIcon name="chevron-up" :size="20" />
      </button>
    </div>

    <!-- 回复弹层 -->
    <div v-if="activeRecord" class="reply-overlay" @click.self="closeReply">
      <div class="reply-sheet">
        <div class="reply-head">
          <div class="reply-head-text">
            <div class="reply-title">{{ activeRecord.title }}</div>
            <div class="reply-time">{{ fmtTime(activeRecord.createdAt) }}</div>
          </div>
          <button class="reply-close" @click="closeReply" aria-label="关闭">
            <AppIcon name="close" :size="16" />
          </button>
        </div>
        <!-- 完整多轮对话：Q 轮文本块 + A 轮 Markdown（第 1 轮 question 也显示）。
             预设记录的第 1 轮 question 只显示短标签（映射见 activeTurns），指令原文不给用户看 -->
        <div class="reply-main">
          <div ref="replyBodyEl" class="reply-body" :class="{ 'reply-body--with-composer': canFollowUp }">
            <template v-for="(t, i) in activeTurns" :key="i">
              <div v-if="t.role === 'user'" class="turn-user">{{ t.content }}</div>
              <div v-else class="turn-ai" v-html="markdownHtml(t.content)"></div>
            </template>
          </div>
          <!-- 思考中：正文区居中的动画层。不能放进 .reply-body——那是滚动容器，
               绝对定位子元素会随内容滚走，必须在滚动容器外、定位容器内 -->
          <div v-if="followingUp" class="reply-thinking">
            <div class="thinking-spinner"></div>
            <div class="thinking-text">AI 正在思考…</div>
          </div>
        </div>

        <!-- 追问错误显示在弹窗内：页面级错误条在遮罩下面，弹窗里看不见 -->
        <div v-if="followUpError" class="reply-error">{{ followUpError }}</div>

        <!-- 追问输入区：仅最新一条记录可继续（canFollowUp），旧记录只读回看 -->
        <div v-if="canFollowUp" class="reply-composer">
          <textarea
            v-model="followUpText"
            class="ai-input"
            rows="1"
            placeholder="继续追问，如「那下周卧推该怎么加量？」"
            :disabled="ai.isLoading"
            @keydown.enter.exact.prevent="sendFollowUp"
          ></textarea>
          <button class="ai-send" :disabled="ai.isLoading || !followUpText.trim()" @click="sendFollowUp" aria-label="发送追问">
            <AppIcon name="chevron-up" :size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- 回复面板纳入返回键 -->
    <BackLayer :show="!!activeRecord" @back="closeReply" />
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '../stores/ai'
import AppIcon from '../components/AppIcon.vue'
import BackLayer from '../components/BackLayer.vue'

const router = useRouter()
const ai = useAiStore()

const question = ref('')
const errorMsg = ref('')
// 弹窗记录按 id 回查而非存对象引用：ai.load() 重建数组、新建会话/清库后引用会变陈旧；
// 回查使记录消失时 computed 变 null，弹窗与 BackLayer 自动收起（清库边界免费解决）
const activeRecordId = ref(null)
const activeRecord = computed(() => ai.records.find(r => r.id === activeRecordId.value) || null)
const listEl = ref(null)
const replyBodyEl = ref(null)
const followUpText = ref('')
const followUpError = ref('')
// 追问在途标志：不复用全局 ai.isLoading——页面级请求在途时点开记录不应误显示"思考中"
const followingUp = ref(false)

// 有 Key 且非加载中即可使用（会话在首次使用时自动建立）
const canUse = computed(() => ai.hasApiKey && !ai.isLoading)

// 弹窗完整对话：第 1 轮 question/reply + thread 里的追问轮
const activeTurns = computed(() => {
  const r = activeRecord.value
  if (!r) return []
  const turns = []
  if (r.question) {
    // 预设记录的第 1 轮 question 是几百字的指令原文，展示短标签即可（用户反馈原文太吵）。
    // 只改展示不改存储：question 列仍是指令原文——追问时要按 continueRecord.question 注入 AI 上下文
    turns.push({ role: 'user', content: r.kind === 'preset' ? `一键咨询·${r.title}` : r.question })
  }
  turns.push({ role: 'assistant', content: r.reply })
  return turns.concat(r.thread || [])
})

// 只有最新一条记录可追问：旧记录纯只读回看，不打断整体问答顺序
const canFollowUp = computed(() =>
  !!activeRecord.value && activeRecord.value.id === ai.records[0]?.id && ai.hasApiKey
)

function recordIcon(r) {
  if (r.kind === 'preset') {
    if (r.title.includes('今日建议')) return 'dumbbell'
    if (r.title.includes('今日总结')) return 'check'
    return 'chart'
  }
  return 'sparkles'
}

/** 'YYYY-MM-DD HH:mm' → 'M月D日 HH:mm'（跨年补年份） */
function fmtTime(createdAt) {
  if (!createdAt) return ''
  const [datePart, timePart] = String(createdAt).split(' ')
  const time = timePart || ''
  if (!datePart) return time
  const [y, m, d] = datePart.split('-')
  const dateTxt = Number(y) === new Date().getFullYear() ? `${Number(m)}月${Number(d)}日` : `${y}-${m}-${d}`
  return time ? `${dateTxt} ${time}` : dateTxt
}

function markdownHtml(content) {
  return renderMarkdown(content)
}

function openReply(r) {
  activeRecordId.value = r.id
  followUpError.value = '' // 换记录清残留错误
  followUpText.value = ''  // 草稿不跨记录携带，避免追问串记录
  // 从第一轮按序读：打开滚到顶部
  nextTick(() => { if (replyBodyEl.value) replyBodyEl.value.scrollTop = 0 })
}
function closeReply() {
  activeRecordId.value = null
  followUpError.value = ''
}

/** 新记录由 store 写入并 unshift 到 records[0]，成功后自动弹出展示回复 */
function openLatestReply() {
  if (ai.records[0]) activeRecordId.value = ai.records[0].id
}

/** 追问（连续对话）：不新建记录，本轮 Q/A 追加进当前弹窗记录的 thread */
async function sendFollowUp() {
  const q = followUpText.value.trim()
  if (!q || !canFollowUp.value || ai.isLoading) return
  followUpError.value = ''
  followingUp.value = true
  try {
    await ai.askFollowUp(activeRecordId.value, q)
    followUpText.value = ''
    await nextTick()
    // 定位：新一轮「我的提问」顶到可视区第一行，AI 回复接在下面。
    // 滚到底部会落在长回复的末尾，还得手动回翻找提问起点（用户反馈）
    const body = replyBodyEl.value
    const qEls = body?.querySelectorAll('.turn-user')
    const qEl = qEls?.[qEls.length - 1]
    if (body && qEl) {
      body.scrollTop = qEl.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop
    }
  } catch (e) {
    followUpError.value = e?.message || String(e) // 失败不落库，输入保留可直接重试
  } finally {
    followingUp.value = false
  }
}

async function send() {
  const q = question.value.trim()
  if (!q || !canUse.value) return
  errorMsg.value = ''
  try {
    await ai.ask(q)
    question.value = ''
    openLatestReply()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

async function runPreset(type) {
  if (!canUse.value) return
  errorMsg.value = ''
  try {
    if (type === 'comprehensive') await ai.analyzeComprehensive()
    else if (type === 'advice') await ai.todayAdvice()
    else await ai.todaySummary()
    openLatestReply()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

function goSettings() {
  router.push('/settings')
}

// 新记录 unshift 到顶部，滚回列表顶部
watch(() => ai.records.length, async () => {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = 0
})

// 返回键由 App.vue 全局统一处理：先关回复弹窗（BackLayer），顶层 Tab 再按一次退出
onMounted(() => {
  ai.load().catch(e => console.error('AI store 加载失败', e))
})

/* ---- 受控 Markdown 渲染：先转义全部 HTML，再插入白名单标签 ---- */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function inlineMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

function renderMarkdown(text) {
  if (!text) return ''
  const lines = escapeHtml(text).split('\n')
  let html = ''
  let listTag = ''
  const closeList = () => {
    if (listTag) { html += `</${listTag}>`; listTag = '' }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    let m = line.match(/^(#{1,3})\s+(.*)$/)
    if (m) {
      closeList()
      const lvl = m[1].length
      html += `<h${lvl}>${inlineMd(m[2])}</h${lvl}>`
      continue
    }
    m = line.match(/^\s*[-*]\s+(.*)$/)
    if (m) {
      if (listTag !== 'ul') { closeList(); html += '<ul>'; listTag = 'ul' }
      html += `<li>${inlineMd(m[1])}</li>`
      continue
    }
    m = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (m) {
      if (listTag !== 'ol') { closeList(); html += '<ol>'; listTag = 'ol' }
      html += `<li>${inlineMd(m[1])}</li>`
      continue
    }
    if (!line.trim()) { closeList(); continue }
    closeList()
    html += `<p>${inlineMd(line)}</p>`
  }
  closeList()
  return html
}
</script>

<style scoped>
.ai-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.ai-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ai-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-title svg {
  color: var(--accent);
}
.ai-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 16px;
}
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 8px 24px;
  gap: 8px;
}
.ai-empty-title {
  font-size: 15px;
  font-weight: 600;
}
.ai-hint {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 8px;
}
/* 记录列表 */
.ai-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0 12px;
  -webkit-overflow-scrolling: touch;
}
.record-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  cursor: pointer;
  transition: border-color 0.2s var(--easing), box-shadow 0.2s var(--easing);
}
.record-card:active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.record-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.record-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.record-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.record-time {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}
.ai-error {
  background: var(--danger-dim);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  margin-bottom: 10px;
}
/* 一键咨询按钮（一行三个，输入框上方） */
.ai-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 10px 16px 0;
  flex-shrink: 0;
}
.ai-preset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s var(--easing);
}
.ai-preset-btn:active:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.ai-preset-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.preset-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.ai-loading-note {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 6px 16px 0;
  flex-shrink: 0;
  animation: ai-pulse 1.4s ease-in-out infinite;
}
@keyframes ai-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
/* 输入区 */
.ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 14px 16px 10px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.ai-input {
  flex: 1;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  outline: none;
  box-sizing: border-box;
}
.ai-input:focus {
  border-color: var(--accent);
}
.ai-input:disabled {
  opacity: 0.5;
}
.ai-send {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s, transform 0.1s;
}
.ai-send:active:not(:disabled) {
  transform: scale(0.94);
}
.ai-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
/* 回复弹层 */
.reply-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 920;
}
.reply-sheet {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  height: min(88vh, 700px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--border-strong);
}
.reply-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.reply-head-text {
  min-width: 0;
}
.reply-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  word-break: break-word;
}
.reply-time {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 3px;
}
.reply-close {
  background: var(--surface-hover);
  border: none;
  color: var(--text-secondary);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.reply-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 20px calc(20px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  font-size: 14px;
  line-height: 1.65;
  color: var(--text-primary);
  -webkit-overflow-scrolling: touch;
}
.reply-body :deep(h1),
.reply-body :deep(h2),
.reply-body :deep(h3) {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-strong);
  margin: 14px 0 6px;
}
.reply-body :deep(h1:first-child),
.reply-body :deep(h2:first-child),
.reply-body :deep(h3:first-child) {
  margin-top: 0;
}
.reply-body :deep(p) {
  margin: 6px 0;
}
.reply-body :deep(ul),
.reply-body :deep(ol) {
  margin: 6px 0;
  padding-left: 18px;
}
.reply-body :deep(li) {
  margin: 3px 0;
}
.reply-body :deep(strong) {
  color: var(--accent-strong);
  font-weight: 600;
}
/* 多轮对话：用户提问块，肉眼与 AI 的 Markdown 回复区分开 */
.turn-user {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin: 12px 0 6px;
  white-space: pre-wrap; /* Shift+Enter 的换行要原样显示 */
}
.turn-user:first-child {
  margin-top: 0;
}
.turn-ai {
  margin: 6px 0 2px;
}
/* 回复正文区外层：给思考动画层当定位容器（动画层盖住整个正文区，但不随内容滚动） */
.reply-main {
  flex: 1;
  min-height: 0;
  position: relative;
  display: flex;
}
/* 思考中：正文区居中动画层，scrim 压暗旧内容、突出 spinner。
   spinner 严格居中（用户要"屏幕中间的动画"）；说明文字绝对定位挂下方，
   不参与居中——flex 把 spinner+文字当一组居中会让动画重心偏上 */
.reply-thinking {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--scrim);
  z-index: 2;
}
.thinking-spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid var(--border-strong);
  border-top-color: var(--accent);
  animation: thinking-spin 0.8s linear infinite;
}
.thinking-text {
  position: absolute;
  top: calc(50% + 28px); /* spinner 半径 18 + 间距 10 */
  left: 0;
  right: 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}
@keyframes thinking-spin {
  to { transform: rotate(360deg); }
}
/* 弹窗内错误条（仿 .ai-error） */
.reply-error {
  background: var(--danger-dim);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 20px;
  font-size: 13px;
  flex-shrink: 0;
}
/* 追问输入区（照抄 .ai-composer，横向 padding 对齐弹窗 20px） */
.reply-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 20px calc(12px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
/* 有输入区时 safe-area 由 .reply-composer 承担，正文不再重复垫高 */
.reply-body--with-composer {
  padding-bottom: 16px;
}
</style>

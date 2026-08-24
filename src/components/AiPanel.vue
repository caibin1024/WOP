<template>
  <div class="ai-overlay" @click.self="$emit('close')">
    <div class="ai-sheet">
      <div class="ai-header">
        <div>
          <div class="ai-title"><AppIcon name="sparkles" :size="18" /> AI 教练</div>
          <div class="ai-sub">带记忆的持续会话 · DeepSeek</div>
        </div>
        <button class="ai-close" @click="$emit('close')" aria-label="关闭">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="ai-body">
        <!-- 未配置 Key -->
        <div v-if="!ai.hasApiKey" class="ai-empty">
          <AppIcon name="sparkles" :size="40" style="color: var(--text-tertiary)" />
          <p class="ai-empty-title">尚未配置 DeepSeek API Key</p>
          <p class="ai-hint">请到「设置 → AI 咨询」填写你的 API Key，即可开始与 AI 教练对话。</p>
          <button class="btn btn-primary" @click="goSettings">
            去设置配置
            <AppIcon name="arrow-right" :size="18" />
          </button>
        </div>

        <!-- 尚未开始会话 -->
        <div v-else-if="!ai.hasConversation" class="ai-empty">
          <AppIcon name="sparkles" :size="40" style="color: var(--text-tertiary)" />
          <p class="ai-empty-title">尚未开始会话</p>
          <p class="ai-hint">新建会话会把你的个人资料与训练节奏发送给 AI（顺带做连接测试），之后即可开始咨询。</p>
          <button class="btn btn-primary" :disabled="ai.isLoading" @click="startConversation">
            <AppIcon name="sparkles" :size="16" />
            <span>{{ ai.isLoading ? '建立中…' : '开始会话' }}</span>
          </button>
        </div>

        <template v-else>
          <!-- 模式切换 -->
          <div class="ai-modes">
            <button class="ai-mode-btn" :class="{ active: mode === 'chat' }" @click="mode = 'chat'">
              聊天咨询
            </button>
            <button class="ai-mode-btn" :class="{ active: mode === 'preset' }" @click="mode = 'preset'">
              一键咨询
            </button>
          </div>

          <!-- 一键模式：预设按钮 -->
          <div v-if="mode === 'preset'" class="ai-presets">
            <button class="ai-preset-btn" :disabled="ai.isLoading" @click="runPreset('comprehensive')">
              <AppIcon name="chart" :size="20" class="preset-icon" />
              <span class="preset-text">
                <b>综合分析</b>
                <small>基于全部训练数据系统性全面分析</small>
              </span>
              <AppIcon name="chevron-right" :size="16" class="preset-arrow" />
            </button>
            <button class="ai-preset-btn" :disabled="ai.isLoading" @click="runPreset('advice')">
              <AppIcon name="dumbbell" :size="20" class="preset-icon" />
              <span class="preset-text">
                <b>今日训练建议</b>
                <small>结合今天计划给出训练建议</small>
              </span>
              <AppIcon name="chevron-right" :size="16" class="preset-arrow" />
            </button>
            <button class="ai-preset-btn" :disabled="ai.isLoading" @click="runPreset('summary')">
              <AppIcon name="check" :size="20" class="preset-icon" />
              <span class="preset-text">
                <b>今日训练总结</b>
                <small>总结今天的训练与注意事项</small>
              </span>
              <AppIcon name="chevron-right" :size="16" class="preset-arrow" />
            </button>
          </div>

          <!-- 会话线程 -->
          <div ref="threadEl" class="ai-thread">
            <template v-for="m in ai.messages" :key="m.id">
              <!-- 系统提示条：初始化 / 数据同步 / 摘要 -->
              <div v-if="m.kind === 'init' || m.kind === 'data' || m.kind === 'summary'" class="ai-note">
                {{ noteText(m) }}
              </div>
              <!-- 预设发起提示卡 -->
              <div v-else-if="m.kind === 'preset'" class="ai-preset-note">
                <AppIcon name="sparkles" :size="13" /> {{ presetLabel(m.content) }}
              </div>
              <!-- 用户气泡 -->
              <div v-else-if="m.role === 'user'" class="ai-bubble ai-bubble-user">{{ m.content }}</div>
              <!-- AI 气泡 -->
              <div v-else class="ai-bubble ai-bubble-ai" v-html="markdownHtml(m.content)"></div>
            </template>

            <!-- 加载中 -->
            <div v-if="ai.isLoading" class="ai-typing">思考中…</div>

            <!-- 错误 -->
            <div v-if="errorMsg" class="ai-error">
              <span>{{ errorMsg }}</span>
            </div>
          </div>

          <!-- 聊天模式：输入 -->
          <div v-if="mode === 'chat'" class="ai-composer">
            <textarea
              v-model="question"
              class="ai-input"
              rows="2"
              placeholder="输入你的问题，如「今天肩部练得怎么样？」"
              :disabled="ai.isLoading"
              @keydown.enter.exact.prevent="send"
            ></textarea>
            <button class="btn btn-primary ai-send" :disabled="ai.isLoading || !question.trim()" @click="send">
              <AppIcon name="arrow-right" :size="16" />
              <span>{{ ai.isLoading ? '思考中…' : '发送' }}</span>
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '../stores/ai'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close'])
const router = useRouter()
const ai = useAiStore()

const mode = ref('chat') // 'chat' | 'preset'
const question = ref('')
const errorMsg = ref('')
const threadEl = ref(null)

function noteText(m) {
  if (m.kind === 'init') return '已建立会话 · 已同步你的个人资料与训练节奏'
  if (m.kind === 'summary') return '历史对话已自动摘要，长期记忆已保留'
  return '已同步新增训练 / 身体 / 有氧数据'
}

function presetLabel(content) {
  if (content.includes('今日训练建议')) return '已发起 今日训练建议'
  if (content.includes('今日训练总结')) return '已发起 今日训练总结'
  if (content.includes('综合分析')) return '已发起 综合分析'
  return '已发起一键咨询'
}

function markdownHtml(content) {
  return renderMarkdown(content)
}

async function startConversation() {
  errorMsg.value = ''
  try {
    await ai.createConversation()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

async function send() {
  const q = question.value.trim()
  if (!q || ai.isLoading) return
  errorMsg.value = ''
  try {
    await ai.ask(q)
    question.value = ''
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

async function runPreset(type) {
  errorMsg.value = ''
  try {
    if (type === 'comprehensive') await ai.analyzeComprehensive()
    else if (type === 'advice') await ai.todayAdvice()
    else await ai.todaySummary()
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

function goSettings() {
  emit('close')
  router.push('/settings')
}

// 新消息 / 加载态变化时自动滚到底部
async function scrollToBottom() {
  await nextTick()
  if (threadEl.value) threadEl.value.scrollTop = threadEl.value.scrollHeight
}
watch(() => [ai.messages.length, ai.isLoading], scrollToBottom)

onMounted(() => {
  ai.load().catch(e => console.error('AI store 加载失败', e))
  scrollToBottom()
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
.ai-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5, 6, 10, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  z-index: 920;
}
.ai-sheet {
  background: var(--bg-elevated);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  width: 100%;
  height: min(86vh, 720px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--border-strong);
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
  padding: 20px 20px 12px;
}
.ai-title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-title svg {
  color: var(--accent);
}
.ai-sub {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.ai-close {
  background: var(--surface-hover);
  border: none;
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ai-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px calc(20px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
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
/* 模式切换 */
.ai-modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 3px;
  background: var(--surface-hover);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
.ai-mode-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 8px 0;
  border-radius: 7px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.ai-mode-btn.active {
  background: var(--surface);
  color: var(--text-primary);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
/* 预设按钮 */
.ai-presets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 12px;
}
.ai-preset-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  color: var(--text-primary);
  transition: all 0.2s var(--easing);
}
.ai-preset-btn:active:not(:disabled) {
  border-color: var(--accent);
  background: var(--accent-dim);
}
.ai-preset-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.preset-icon {
  color: var(--accent);
  flex-shrink: 0;
}
.preset-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.preset-text b {
  font-size: 14px;
  font-weight: 600;
}
.preset-text small {
  font-size: 11px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preset-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}
/* 线程 */
.ai-thread {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 2px;
  -webkit-overflow-scrolling: touch;
}
.ai-note {
  align-self: center;
  max-width: 90%;
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--surface-hover);
  border-radius: 12px;
  padding: 4px 12px;
  text-align: center;
}
.ai-preset-note {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--accent-strong);
  background: var(--accent-dim);
  border-radius: 12px;
  padding: 5px 12px;
}
.ai-bubble {
  max-width: 85%;
  padding: 10px 13px;
  font-size: 14px;
  line-height: 1.65;
  border-radius: 14px;
  word-break: break-word;
}
.ai-bubble-user {
  align-self: flex-end;
  background: var(--accent);
  color: var(--on-accent);
  border-bottom-right-radius: 5px;
}
.ai-bubble-ai {
  align-self: flex-start;
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: 5px;
  color: var(--text-primary);
}
.ai-bubble-ai :deep(h1),
.ai-bubble-ai :deep(h2),
.ai-bubble-ai :deep(h3) {
  font-size: 14px;
  font-weight: 700;
  color: var(--accent-strong);
  margin: 12px 0 5px;
}
.ai-bubble-ai :deep(h1:first-child),
.ai-bubble-ai :deep(h2:first-child),
.ai-bubble-ai :deep(h3:first-child) {
  margin-top: 0;
}
.ai-bubble-ai :deep(p) {
  margin: 5px 0;
}
.ai-bubble-ai :deep(ul),
.ai-bubble-ai :deep(ol) {
  margin: 5px 0;
  padding-left: 18px;
}
.ai-bubble-ai :deep(li) {
  margin: 2px 0;
}
.ai-bubble-ai :deep(strong) {
  color: var(--accent-strong);
  font-weight: 600;
}
.ai-typing {
  align-self: flex-start;
  font-size: 12px;
  color: var(--text-tertiary);
  padding: 4px 2px;
  animation: ai-pulse 1.4s ease-in-out infinite;
}
@keyframes ai-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.ai-error {
  background: var(--danger-dim);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
}
/* 输入区 */
.ai-composer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding-top: 10px;
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
  padding: 10px 12px;
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
  flex-shrink: 0;
  min-height: 42px;
  padding: 0 16px;
}
</style>

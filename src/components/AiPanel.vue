<template>
  <div class="ai-overlay" @click.self="$emit('close')">
    <div class="ai-sheet">
      <div class="ai-header">
        <div>
          <div class="ai-title"><AppIcon name="sparkles" :size="18" /> AI 教练</div>
          <div class="ai-sub">DeepSeek 分析你的训练记录</div>
        </div>
        <button class="ai-close" @click="$emit('close')">
          <AppIcon name="close" :size="16" />
        </button>
      </div>

      <div class="ai-body">
        <!-- 未配置 Key -->
        <div v-if="!ai.hasApiKey" class="ai-empty">
          <AppIcon name="sparkles" :size="40" style="color: var(--text-tertiary)" />
          <p class="ai-empty-title">尚未配置 DeepSeek API Key</p>
          <p class="ai-hint">请到「设置 → AI 咨询」填写你的 API Key，即可开始分析训练记录。</p>
          <button class="btn btn-primary" @click="goSettings">
            去设置配置
            <AppIcon name="arrow-right" :size="18" />
          </button>
        </div>

        <template v-else>
          <!-- 时间范围 -->
          <div class="ai-range">
            <button
              v-for="r in rangeOptions"
              :key="r.value"
              class="ai-range-btn"
              :class="{ active: rangeDays === r.value }"
              @click="rangeDays = r.value"
            >{{ r.label }}</button>
          </div>

          <!-- 问题输入 -->
          <textarea
            v-model="question"
            class="ai-question"
            rows="2"
            placeholder="可选：针对训练提问，如「肩部怎么练得更饱满？」"
          ></textarea>

          <!-- 开始分析 -->
          <button class="btn btn-primary ai-go" :disabled="ai.isLoading" @click="start">
            <AppIcon name="sparkles" :size="16" />
            <span>{{ ai.isLoading ? '分析中，约需 30~90 秒…' : '开始分析' }}</span>
          </button>

          <!-- 结果 -->
          <div v-if="resultHtml" class="ai-result" v-html="resultHtml"></div>

          <!-- 错误 -->
          <div v-if="errorMsg" class="ai-error">
            <span>{{ errorMsg }}</span>
            <button v-if="canRetry" class="ai-retry" @click="start">重试</button>
          </div>
        </template>

        <!-- 历史 -->
        <div v-if="ai.consultations.length" class="ai-history">
          <div class="ai-history-title">历史咨询</div>
          <div
            v-for="c in ai.consultations"
            :key="c.id"
            class="ai-history-item"
            :class="{ viewing: viewingId === c.id }"
            @click="viewHistory(c)"
          >
            <div class="ai-history-main">
              <span class="ai-history-date num">{{ c.date }}</span>
              <span class="ai-history-label">{{ c.rangeLabel }}</span>
              <span class="ai-history-q">{{ c.question || '综合分析' }}</span>
            </div>
            <button class="ai-history-del" @click.stop="delHistory(c)">
              <AppIcon name="trash" :size="15" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAiStore } from '../stores/ai'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close'])
const router = useRouter()
const ai = useAiStore()

const rangeOptions = [
  { value: 7, label: '近7天' },
  { value: 30, label: '近30天' },
  { value: 90, label: '近90天' },
  { value: 'all', label: '全部' }
]

const rangeDays = ref(30)
const question = ref('')
const result = ref('')
const errorMsg = ref('')
const viewingId = ref('')

// 展示结果或错误后给出重试入口（有 Key 且非加载中）
const canRetry = computed(() => !!errorMsg.value && !ai.isLoading)

const resultHtml = computed(() => renderMarkdown(result.value))

async function start() {
  errorMsg.value = ''
  try {
    result.value = await ai.analyze({ question: question.value, rangeDays: rangeDays.value })
    viewingId.value = ''
    question.value = ''
  } catch (e) {
    errorMsg.value = e?.message || String(e)
  }
}

function viewHistory(c) {
  result.value = c.result
  viewingId.value = c.id
  errorMsg.value = ''
}

function delHistory(c) {
  if (!confirm('删除这条咨询记录？')) return
  ai.deleteConsultation(c.id)
  if (viewingId.value === c.id) {
    viewingId.value = ''
    result.value = ''
  }
}

function goSettings() {
  emit('close')
  router.push('/settings')
}

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
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px 20px calc(24px + var(--safe-bottom-real, env(safe-area-inset-bottom)));
  border-top: 1px solid var(--border-strong);
}
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 8px 8px;
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
.ai-range {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.ai-range-btn {
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 9px 0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.ai-range-btn.active {
  background: var(--accent);
  border-color: transparent;
  color: var(--on-accent);
  font-weight: 600;
}
.ai-question {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}
.ai-question:focus {
  border-color: var(--accent);
}
.ai-go {
  width: 100%;
  margin-top: 12px;
  padding: 13px;
  font-size: 15px;
}
.ai-result {
  margin-top: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  word-break: break-word;
}
.ai-result :deep(h1),
.ai-result :deep(h2),
.ai-result :deep(h3) {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-strong);
  margin: 14px 0 6px;
}
.ai-result :deep(h1:first-child),
.ai-result :deep(h2:first-child),
.ai-result :deep(h3:first-child) {
  margin-top: 0;
}
.ai-result :deep(p) {
  margin: 6px 0;
}
.ai-result :deep(ul),
.ai-result :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}
.ai-result :deep(li) {
  margin: 3px 0;
}
.ai-result :deep(strong) {
  color: var(--accent-strong);
  font-weight: 600;
}
.ai-error {
  margin-top: 12px;
  background: var(--danger-dim);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: var(--danger);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.ai-retry {
  background: transparent;
  border: 1px solid currentColor;
  color: inherit;
  border-radius: var(--radius-sm);
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.ai-history {
  margin-top: 20px;
}
.ai-history-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 8px;
}
.ai-history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s var(--easing);
}
.ai-history-item:hover,
.ai-history-item.viewing {
  background: var(--surface-hover);
}
.ai-history-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-history-date {
  font-size: 12px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}
.ai-history-label {
  font-size: 11px;
  background: var(--accent-dim);
  color: var(--accent-strong);
  padding: 1px 8px;
  border-radius: 12px;
  flex-shrink: 0;
}
.ai-history-q {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-history-del {
  background: transparent;
  border: none;
  color: var(--text-tertiary);
  padding: 6px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.ai-history-del:active {
  color: var(--danger);
}
</style>

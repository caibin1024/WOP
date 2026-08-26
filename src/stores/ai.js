import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId, todayStr, nowStr } from '../database'
import {
  callDeepSeek,
  SYSTEM_PROMPT,
  SUMMARY_CHAR_THRESHOLD,
  buildInitialContext,
  buildDataUpdate,
  buildSummaryRequest,
  buildComprehensivePrompt,
  buildTodayAdvicePrompt,
  buildTodaySummaryPrompt
} from '../services/aiCoach'

/**
 * AI 咨询 Store（持续会话模式，v0.2.6）
 * - API Key：存 app_meta（key='deepseek_api_key'），仅本机，不编入 APK、不入导出
 * - 会话消息：ai_messages 表（seq 排序，kind 分类），一直用同一个会话
 * - 新建会话（createConversation）：清空旧会话 → 发初始上下文 → AI 确认回复存为第一条，兼当连接测试
 * - 每次询问/预设前：检测新增数据增量上传（ai_uploaded=0 → 标记 1），接近上下文上限时自动摘要
 * - 两种咨询模式共用 sendRequest：聊天 ask + 三条预设（综合分析/今日训练建议/今日训练总结）
 */
export const useAiStore = defineStore('ai', () => {
  const apiKey = ref('')
  const hasApiKey = computed(() => !!apiKey.value.trim())
  const messages = ref([]) // [{ id, seq, role, kind, content, createdAt }]
  const hasConversation = computed(() => messages.value.length > 0)
  const records = ref([]) // [{ id, kind, title, question, reply, createdAt }] 咨询记录列表（最新在前）
  const isLoading = ref(false)
  const error = ref('')

  async function load() {
    await initDatabase()
    const rows = await query("SELECT value FROM app_meta WHERE key = 'deepseek_api_key'", [])
    apiKey.value = rows.length ? rows[0].value : ''
    await loadMessages()
    await loadRecords()
  }

  async function loadMessages() {
    const rows = await query('SELECT * FROM ai_messages ORDER BY seq ASC', [])
    messages.value = rows.map(r => ({
      id: r.id,
      seq: r.seq,
      role: r.role,
      kind: r.kind,
      content: r.content,
      createdAt: r.created_at
    }))
  }

  async function loadRecords() {
    const rows = await query('SELECT * FROM ai_consult_records ORDER BY created_at DESC, id DESC', [])
    records.value = rows.map(r => ({
      id: r.id,
      kind: r.kind,
      title: r.title,
      question: r.question,
      reply: r.reply,
      createdAt: r.created_at
    }))
  }

  /** 写入一条咨询记录（独立于会话消息，自动摘要不丢历史） */
  async function insertRecord({ kind, title, question, reply }) {
    const id = genId()
    const createdAt = nowStr()
    await run(
      'INSERT INTO ai_consult_records (id, kind, title, question, reply, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, kind, title, question, reply, createdAt]
    )
    return { id, kind, title, question, reply, createdAt }
  }

  /** 记录标题：预设 → 预设标签；提问 → 去空白 + 截断 */
  function makeRecordTitle(kind, content) {
    if (kind === 'preset') {
      if (content.includes('今日训练建议')) return '今日训练建议'
      if (content.includes('今日训练总结')) return '今日训练总结'
      return '综合分析'
    }
    const s = String(content || '').replace(/\s+/g, ' ').trim()
    return s.length > 26 ? s.slice(0, 26) + '…' : s
  }

  async function nextSeq() {
    const rows = await query('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM ai_messages', [])
    return rows[0]?.n || 1
  }

  async function insertMessage({ role, kind, content }) {
    const seq = await nextSeq()
    const id = genId()
    const date = todayStr()
    await run(
      'INSERT INTO ai_messages (id, seq, role, kind, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, seq, role, kind, content, date]
    )
    return { id, seq, role, kind, content, createdAt: date }
  }

  async function saveApiKey(key) {
    const k = String(key).trim()
    await initDatabase()
    await run(
      `INSERT INTO app_meta (key, value) VALUES ('deepseek_api_key', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [k]
    )
    apiKey.value = k
  }

  function requireKey() {
    if (!hasApiKey.value) throw new Error('未配置 API Key，请到「设置 → AI 咨询」填写')
  }

  /**
   * 新建会话（重置 + 连接测试）：清空旧会话 → 发送初始上下文 → AI 确认回复存为会话第一条。
   * 成功后落库；失败抛错且不动旧会话（Key 修好重试即可，不毁现有会话）。
   */
  async function createConversation() {
    requireKey()
    if (isLoading.value) return
    isLoading.value = true
    error.value = ''
    try {
      const initContent = await buildInitialContext()
      const reply = await callDeepSeek({
        apiKey: apiKey.value,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: initContent }
        ]
      })
      await run('DELETE FROM ai_messages', [])
      await run('DELETE FROM ai_consult_records', []) // 新建会话重置记录列表
      records.value = []
      // 清空会话后旧数据仍带 ai_uploaded=1，会让新会话永远看不到历史训练/身体/有氧数据。
      // 重置三个表的上传水位，使下次咨询自动把全部数据重新同步给 AI。
      for (const t of ['training_logs', 'body_records', 'aerobic_logs']) {
        await run(`UPDATE ${t} SET ai_uploaded = 0`, [])
      }
      const initMsg = await insertMessage({ role: 'user', kind: 'init', content: initContent })
      const replyMsg = await insertMessage({ role: 'assistant', kind: 'reply', content: reply })
      messages.value = [initMsg, replyMsg]
      return reply
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** 预估会话字符数（CJK 约 1 token/2 字符，保守估算，不含将加入的数据/问题） */
  function estimateChars() {
    return messages.value.reduce((s, m) => s + (m.content?.length || 0), 0)
  }

  /**
   * 自动摘要：把当前会话中除初始上下文外的所有消息（数据/问答/预设）交给 AI 浓缩，
   * 替换为一条 summary 消息，长期记忆不丢。
   */
  async function summarize() {
    const all = [...messages.value]
      .sort((a, b) => a.seq - b.seq)
      .filter(m => m.kind !== 'init')
      .map(m => ({ role: m.role, content: m.content }))
    const summaryText = await callDeepSeek({
      apiKey: apiKey.value,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...all,
        { role: 'user', content: buildSummaryRequest() }
      ]
    })
    const initMsgs = messages.value.filter(m => m.kind === 'init')
    await run("DELETE FROM ai_messages WHERE kind != 'init'", [])
    const summaryMsg = await insertMessage({ role: 'user', kind: 'summary', content: summaryText })
    messages.value = [...initMsgs, summaryMsg]
    return summaryMsg
  }

  /**
   * 统一发送请求（聊天 ask 与三条预设共用）：
   * 同步增量数据 → 超限自动摘要 → 组装 [system + 历史 + 数据 + 提问] → DeepSeek
   * → 成功落库（数据/提问/回复）并标记 ai_uploaded=1；失败不落库不标记（重试自动重同步）
   * @param {Object} opts { userContent, kind }  kind: 'ask' | 'preset'
   */
  async function sendRequest({ userContent, kind }) {
    requireKey()
    if (isLoading.value) return
    // 首次使用自动建会话（发初始上下文 + 连接测试）；已有会话则跳过
    if (!hasConversation.value) {
      await createConversation()
    }
    isLoading.value = true
    error.value = ''
    try {
      // 1. 增量数据（自上次同步以来新增）
      const dataUpdate = await buildDataUpdate()
      const hasData = !!dataUpdate.content

      // 2. 自动摘要：加入本次数据/问题前评估，超阈值先摘要（压缩后上下文放得下）
      if (estimateChars() > SUMMARY_CHAR_THRESHOLD) {
        await summarize()
      }

      // 3. 组装请求 messages
      const apiMessages = [{ role: 'system', content: SYSTEM_PROMPT }]
      for (const m of [...messages.value].sort((a, b) => a.seq - b.seq)) {
        apiMessages.push({ role: m.role, content: m.content })
      }
      if (hasData) apiMessages.push({ role: 'user', content: dataUpdate.content })
      apiMessages.push({ role: 'user', content: userContent })

      const reply = await callDeepSeek({ apiKey: apiKey.value, messages: apiMessages })

      // 4. 成功落库：数据消息 + 用户消息 + 回复
      const added = []
      if (hasData) {
        added.push(await insertMessage({ role: 'user', kind: 'data', content: dataUpdate.content }))
      }
      added.push(await insertMessage({ role: 'user', kind, content: userContent }))
      added.push(await insertMessage({ role: 'assistant', kind: 'reply', content: reply }))

      // 5. 标记已上传（只标记本次发送的行，剩余留待下次）
      if (hasData) {
        if (dataUpdate.trainingIds.length) await markUploaded('training_logs', dataUpdate.trainingIds)
        if (dataUpdate.bodyIds.length) await markUploaded('body_records', dataUpdate.bodyIds)
        if (dataUpdate.aerobicIds.length) await markUploaded('aerobic_logs', dataUpdate.aerobicIds)
      }

      // 6. 写入咨询记录（独立于会话消息，列表展示用；自动摘要不丢历史）
      const rec = await insertRecord({
        kind,
        title: makeRecordTitle(kind, userContent),
        question: userContent,
        reply
      })
      records.value.unshift(rec)

      messages.value.push(...added)
      return reply
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** 把指定 id 的行标记为已上传（分批 IN 更新，规避 SQLite 参数上限） */
  async function markUploaded(table, ids) {
    if (!ids.length) return
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      const placeholders = chunk.map(() => '?').join(',')
      await run(`UPDATE ${table} SET ai_uploaded = 1 WHERE id IN (${placeholders})`, chunk)
    }
  }

  /** 聊天框咨询：只针对问题作答 */
  async function ask(question) {
    const q = String(question || '').trim()
    if (!q) return
    return sendRequest({ userContent: q, kind: 'ask' })
  }

  /** 预设①：综合分析 */
  async function analyzeComprehensive() {
    return sendRequest({ userContent: buildComprehensivePrompt(), kind: 'preset' })
  }

  /** 预设②：今日训练建议（结合当天计划） */
  async function todayAdvice() {
    return sendRequest({ userContent: await buildTodayAdvicePrompt(), kind: 'preset' })
  }

  /** 预设③：今日训练总结 */
  async function todaySummary() {
    return sendRequest({ userContent: buildTodaySummaryPrompt(), kind: 'preset' })
  }

  return {
    apiKey,
    hasApiKey,
    messages,
    hasConversation,
    records,
    isLoading,
    error,
    load,
    saveApiKey,
    createConversation,
    ask,
    analyzeComprehensive,
    todayAdvice,
    todaySummary
  }
})

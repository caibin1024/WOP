import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId, todayStr, nowStr } from '../database'
import {
  callAI,
  AI_PROVIDERS,
  SYSTEM_PROMPT,
  MEMORY_SYSTEM_PROMPT,
  MEMORY_WINDOW_SIZE,
  buildInitialContext,
  buildDataUpdate,
  buildDataOverview,
  buildMemoryUpdateRequest,
  buildComprehensivePrompt,
  buildTodayAdvicePrompt,
  buildTodaySummaryPrompt
} from '../services/aiCoach'

/**
 * AI 咨询 Store（持续会话 + 分层记忆 + 双供应商）
 * - 供应商：app_meta（key='ai_provider'）∈ deepseek|mimo，读不到默认 deepseek（老用户无感，故无需迁移）
 * - API Key：app_meta（key=`${provider}_api_key`）两把各存各的，来回切换不丢；仅本机，不编入 APK、不入导出
 * - 长期记忆：app_meta（key='ai_memory'），AI 增量维护的要点档案；随对话逐步积累、去重精简，
 *   早期关键信息（目标/伤病史/动作趋势/历史结论）稳定保留，不再被反复压缩稀释
 * - 滚动对话窗口：ai_messages 表只保留最近 MEMORY_WINDOW_SIZE 条真实对话（data/ask/preset/reply），
 *   更早的消息折叠进长期记忆
 * - 数据概览：每次咨询前本地 SQL 聚合（今日计划/PR/体重走势/有氧累计），动态注入 prompt，
 *   具体数字永远实时准确，不依赖 AI"记住"
 * - 个人资料：每次动态注入（buildInitialContext），改身高/目标立即生效
 * - 增量数据：ai_uploaded=0 的新训练/身体/有氧记录，每次咨询前增量上传
 */
export const useAiStore = defineStore('ai', () => {
  const provider = ref('deepseek') // 当前供应商 id，缺省 deepseek
  const keys = ref({ deepseek: '', mimo: '' }) // 两把 key 各存各的，切换供应商互不覆盖
  // apiKey 语义 = 当前供应商的 key：切换供应商时 hasApiKey/门禁/空态自动联动，无需二次查库
  const apiKey = computed(() => keys.value[provider.value] || '')
  const hasApiKey = computed(() => !!apiKey.value.trim())
  // 展示名带兜底：非法 provider（手工改库/回滚残留）不能让模板取子属性时炸组件
  const providerLabel = computed(() => (AI_PROVIDERS[provider.value] || AI_PROVIDERS.deepseek).label)
  const messages = ref([]) // 滚动窗口 [{ id, seq, role, kind, content, createdAt }]
  const memory = ref('')   // 长期记忆文本
  const hasConversation = computed(() => messages.value.length > 0)
  const records = ref([]) // 咨询记录列表（最新在前）
  const isLoading = ref(false)
  const error = ref('')

  async function load() {
    await initDatabase()
    // 一次读三键：两把 key 都进内存，切换供应商时输入框可立即取到另一家的 key，
    // 避免"切换瞬间还显示旧家 key"的竞态。ai_provider 读不到/非法 → 保持默认 deepseek。
    const rows = await query(
      "SELECT key, value FROM app_meta WHERE key IN ('ai_provider', 'deepseek_api_key', 'mimo_api_key')",
      []
    )
    for (const r of rows) {
      if (r.key === 'ai_provider') {
        if (AI_PROVIDERS[r.value]) provider.value = r.value
      } else if (r.key === 'deepseek_api_key') {
        keys.value.deepseek = r.value
      } else if (r.key === 'mimo_api_key') {
        keys.value.mimo = r.value
      }
    }
    await loadMemory()
    await loadMessages()
    await loadRecords()
  }

  async function loadMemory() {
    const rows = await query("SELECT value FROM app_meta WHERE key = 'ai_memory'", [])
    memory.value = rows.length ? rows[0].value : ''
  }

  async function saveMemory(text) {
    const t = String(text || '').trim()
    await run(
      `INSERT INTO app_meta (key, value) VALUES ('ai_memory', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [t]
    )
    memory.value = t
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

  /** 写入一条咨询记录（独立于会话消息，记忆折叠不丢历史） */
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
    // key 名按 `${provider}_api_key` 推导：deepseek 恰好命中既有键名，老数据零迁移
    const metaKey = `${provider.value}_api_key`
    await run(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [metaKey, k]
    )
    keys.value = { ...keys.value, [provider.value]: k }
  }

  /** 切换 AI 供应商：只改选择本身，不清会话/记忆/上传水位（两家 OpenAI 兼容，历史可续读） */
  async function setProvider(p) {
    if (!AI_PROVIDERS[p] || provider.value === p) return // 非法 id 忽略；同值幂等省一次写库
    await initDatabase()
    await run(
      `INSERT INTO app_meta (key, value) VALUES ('ai_provider', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [p]
    )
    provider.value = p
  }

  function requireKey() {
    if (!hasApiKey.value) throw new Error('未配置 API Key，请到「设置 → AI 咨询」填写')
  }

  /**
   * 长期记忆维护：把窗口外的旧消息（含旧架构遗留的 init/summary）增量合并进长期记忆，
   * 然后从 ai_messages 删除，窗口只保留最近 MEMORY_WINDOW_SIZE 条真实对话。
   * 首次咨询时若旧会话超窗，会在这里自然完成历史迁移（不主动删数据、不丢历史）。
   */
  async function maintainMemory() {
    const all = [...messages.value].sort((a, b) => a.seq - b.seq)
    const dialog = all.filter(m => ['data', 'ask', 'preset', 'reply'].includes(m.kind))
    const overflow = [
      ...all.filter(m => m.kind === 'init' || m.kind === 'summary'),
      ...dialog.slice(0, Math.max(0, dialog.length - MEMORY_WINDOW_SIZE))
    ]
    if (!overflow.length) return

    const overflowText = overflow
      .map(m => `[${m.role === 'assistant' ? 'AI' : '用户'}] ${m.content}`)
      .join('\n\n')

    const memMessages = [{ role: 'system', content: MEMORY_SYSTEM_PROMPT }]
    if (memory.value) memMessages.push({ role: 'user', content: `【你现有的长期记忆】\n${memory.value}` })
    memMessages.push({ role: 'user', content: `【需要纳入记忆的近期内容】\n${overflowText}` })
    memMessages.push({ role: 'user', content: buildMemoryUpdateRequest() })

    // 记忆上限 2000 中文字符，中文 1 字约 1.5~2 token，max_tokens 需留足，避免输出被截断
    const newMemory = await callAI({ provider: provider.value, apiKey: apiKey.value, messages: memMessages, maxTokens: 4000 })
    await saveMemory(newMemory)

    // 删除被折叠的消息，窗口只保留最近 MEMORY_WINDOW_SIZE 条真实对话
    const keepIds = new Set(dialog.slice(-MEMORY_WINDOW_SIZE).map(m => m.id))
    const toDelete = all.filter(m => !keepIds.has(m.id)).map(m => m.id)
    for (let i = 0; i < toDelete.length; i += 500) {
      const chunk = toDelete.slice(i, i + 500)
      const ph = chunk.map(() => '?').join(',')
      await run(`DELETE FROM ai_messages WHERE id IN (${ph})`, chunk)
    }
    messages.value = dialog.slice(-MEMORY_WINDOW_SIZE)
  }

  /**
   * 新建会话（重置 + 连接测试）：清空旧会话、长期记忆与记录列表 → 发初始上下文拿一条确认
   * 作为窗口第一条（兼当连接测试）。成功后落库；失败抛错且不动旧会话。
   */
  async function createConversation() {
    requireKey()
    if (isLoading.value) return
    isLoading.value = true
    error.value = ''
    try {
      const reply = await callAI({
        provider: provider.value,
        apiKey: apiKey.value,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: await buildInitialContext() }
        ]
      })
      await run('DELETE FROM ai_messages', [])
      await run('DELETE FROM ai_consult_records', [])
      await run("DELETE FROM app_meta WHERE key = 'ai_memory'", [])
      messages.value = []
      records.value = []
      memory.value = ''
      // 清空会话后旧数据仍带 ai_uploaded=1，会让新会话看不到历史数据；重置上传水位，
      // 使下次咨询自动把全部数据重新同步给 AI。
      for (const t of ['training_logs', 'body_records', 'aerobic_logs']) {
        await run(`UPDATE ${t} SET ai_uploaded = 0`, [])
      }
      const replyMsg = await insertMessage({ role: 'assistant', kind: 'reply', content: reply })
      messages.value = [replyMsg]
      return reply
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 统一发送请求（聊天 ask 与三条预设共用）：
   * 维护长期记忆 → 增量数据 → 组装 [system(含记忆) + 个人资料 + 数据概览(含今日计划) + 滚动窗口 + 数据 + 提问]
   * → 所选供应商 → 成功落库（数据/提问/回复）并标记 ai_uploaded=1；失败不落库不标记。
   */
  async function sendRequest({ userContent, kind }) {
    requireKey()
    if (isLoading.value) return
    if (!hasConversation.value) await createConversation()
    isLoading.value = true
    error.value = ''
    try {
      // 1. 长期记忆维护（窗口超限/旧数据折叠，首次咨询自然迁移旧会话）
      //    折叠是后台优化：网络/余额异常时静默跳过，保留窗口消息下次再试，不阻断本次咨询
      try {
        await maintainMemory()
      } catch (e) { /* 记忆维护失败不阻断咨询 */ }

      // 2. 增量数据（自上次同步以来新增）
      const dataUpdate = await buildDataUpdate()
      const hasData = !!dataUpdate.content

      // 3. 组装请求 messages
      const systemContent = memory.value
        ? `${SYSTEM_PROMPT}\n\n【你的长期记忆（随对话积累）】\n${memory.value}`
        : SYSTEM_PROMPT
      const apiMessages = [{ role: 'system', content: systemContent }]
      apiMessages.push({ role: 'user', content: await buildInitialContext() })
      const overview = await buildDataOverview()
      if (overview) apiMessages.push({ role: 'user', content: overview })
      for (const m of [...messages.value].sort((a, b) => a.seq - b.seq)) {
        apiMessages.push({ role: m.role, content: m.content })
      }
      if (hasData) apiMessages.push({ role: 'user', content: dataUpdate.content })
      apiMessages.push({ role: 'user', content: userContent })

      const reply = await callAI({ provider: provider.value, apiKey: apiKey.value, messages: apiMessages })

      // 4. 成功落库：数据消息 + 用户消息 + 回复
      const added = []
      if (hasData) added.push(await insertMessage({ role: 'user', kind: 'data', content: dataUpdate.content }))
      added.push(await insertMessage({ role: 'user', kind, content: userContent }))
      added.push(await insertMessage({ role: 'assistant', kind: 'reply', content: reply }))

      // 5. 标记已上传（只标记本次发送的行，剩余留待下次）
      if (hasData) {
        if (dataUpdate.trainingIds.length) await markUploaded('training_logs', dataUpdate.trainingIds)
        if (dataUpdate.bodyIds.length) await markUploaded('body_records', dataUpdate.bodyIds)
        if (dataUpdate.aerobicIds.length) await markUploaded('aerobic_logs', dataUpdate.aerobicIds)
      }

      // 6. 写入咨询记录（独立于会话消息，列表展示用；记忆折叠不丢历史）
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
    provider,
    providerLabel,
    apiKey,
    hasApiKey,
    messages,
    hasConversation,
    records,
    isLoading,
    error,
    load,
    saveApiKey,
    setProvider,
    createConversation,
    ask,
    analyzeComprehensive,
    todayAdvice,
    todaySummary
  }
})

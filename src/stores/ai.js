import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { initDatabase, query, run, genId, todayStr } from '../database'
import {
  buildUserContent,
  callDeepSeek,
  testDeepSeek,
  SYSTEM_PROMPT,
  RANGE_LABELS
} from '../services/aiCoach'

/**
 * AI 咨询 Store
 * - API Key：存 app_meta（key='deepseek_api_key'），仅本机，不编入 APK、不入导出
 * - 咨询历史：ai_consultations 表
 * - 分析：按时间范围聚合训练数据 → DeepSeek；页面卸载不中断（原生无 abort，结果落库后历史可见）
 */
export const useAiStore = defineStore('ai', () => {
  const apiKey = ref('')
  const hasApiKey = computed(() => !!apiKey.value.trim())
  const consultations = ref([])
  const isLoading = ref(false)
  const currentResult = ref('')
  const error = ref('')

  async function load() {
    await initDatabase()
    const rows = await query("SELECT value FROM app_meta WHERE key = 'deepseek_api_key'", [])
    apiKey.value = rows.length ? rows[0].value : ''
    await loadConsultations()
  }

  async function loadConsultations() {
    const rows = await query(
      'SELECT * FROM ai_consultations ORDER BY created_at DESC, id DESC LIMIT 50',
      []
    )
    consultations.value = rows.map(r => ({
      id: r.id,
      date: r.date,
      question: r.question,
      rangeLabel: r.range_label,
      result: r.result,
      createdAt: r.created_at
    }))
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

  async function testConnection() {
    if (!hasApiKey.value) throw new Error('请先保存 API Key')
    await testDeepSeek({ apiKey: apiKey.value })
    return '连接成功 ✓'
  }

  /**
   * 一键分析 / 带问题分析
   * @param {Object} opts { question='', rangeDays=30 }  rangeDays: 7|30|90|'all'
   * @returns {Promise<string>} 分析结果 Markdown
   */
  async function analyze({ question = '', rangeDays = 30 }) {
    if (isLoading.value) return
    if (!hasApiKey.value) {
      const msg = '未配置 API Key，请到「设置 → AI 咨询」填写'
      error.value = msg
      throw new Error(msg)
    }
    isLoading.value = true
    error.value = ''
    try {
      const userContent = await buildUserContent({ question, rangeDays })
      const result = await callDeepSeek({
        apiKey: apiKey.value,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent }
        ]
      })
      await run(
        `INSERT INTO ai_consultations (id, date, question, range_label, result, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [genId(), todayStr(), question.trim(), RANGE_LABELS[rangeDays] || '', result, todayStr()]
      )
      currentResult.value = result
      await loadConsultations()
      return result
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function deleteConsultation(id) {
    await run('DELETE FROM ai_consultations WHERE id = ?', [id])
    await loadConsultations()
  }

  return {
    apiKey,
    hasApiKey,
    consultations,
    isLoading,
    currentResult,
    error,
    load,
    saveApiKey,
    testConnection,
    analyze,
    deleteConsultation
  }
})

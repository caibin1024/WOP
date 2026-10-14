<template>
  <div class="exercise-detail-view">
    <div v-if="exercise" class="detail-wrap">
      <!-- 返回 + 自定义动作的编辑/删除入口（内置 44 个只读，无入口） -->
      <div class="detail-topbar">
        <button class="back-btn" @click="goBack">
          <AppIcon class="back-icon" name="arrow-right" :size="18" />
          <span>返回动作库</span>
        </button>
        <div v-if="isCustom" class="topbar-actions">
          <button class="back-btn" @click="editing = true">
            <AppIcon name="pencil" :size="15" />
            <span>编辑</span>
          </button>
          <button class="back-btn danger" @click="onDelete">
            <AppIcon name="trash" :size="15" />
            <span>删除</span>
          </button>
        </div>
      </div>

      <!-- 头部 -->
      <div class="detail-header card">
        <div class="detail-name">{{ exercise.name }}</div>
        <div class="detail-tags">
          <span class="tag-muscle">{{ MUSCLE_GROUP_LABELS[exercise.category] }}</span>
          <span class="tag-muscle">{{ exercise.targetMuscle }}</span>
          <span class="tag-type" :class="exercise.isMachine ? 'machine' : 'free'">
            {{ exercise.isMachine ? '器械动作' : '自由重量' }}
          </span>
        </div>
      </div>

      <!-- 图片/视频 -->
      <div v-if="exercise.imageAssetPath" class="card">
        <div class="card-title"><AppIcon name="teach" :size="16" style="color: var(--accent)" /> 演示</div>
        <img :src="exercise.imageAssetPath" :alt="exercise.name" class="demo-img">
      </div>
      <div v-else-if="exercise.videoUrl" class="card">
        <div class="card-title"><AppIcon name="teach" :size="16" style="color: var(--accent)" /> 演示视频</div>
        <div class="video-wrap">
          <iframe :src="exercise.videoUrl" frameborder="0" allowfullscreen></iframe>
        </div>
      </div>

      <!-- 步骤说明 -->
      <div class="card">
        <div class="card-title">动作步骤</div>
        <div class="steps">
          <pre class="steps-text">{{ exercise.instructions }}</pre>
        </div>
      </div>

      <!-- 常见错误 -->
      <div v-if="exercise.commonMistakes" class="card card-warn">
        <div class="card-title">常见错误</div>
        <pre class="steps-text">{{ exercise.commonMistakes }}</pre>
      </div>

      <!-- 小贴士 -->
      <div v-if="exercise.tips" class="card card-tips">
        <div class="card-title">小贴士</div>
        <pre class="steps-text">{{ exercise.tips }}</pre>
      </div>

      <!-- 计划内动作：默认配置已迁移到设置页 -->
      <div v-if="inPlan" class="card config-moved">
        <div class="card-title"><AppIcon name="settings" :size="16" style="color: var(--accent)" /> 默认配置</div>
        <p class="config-hint">该动作在训练计划中，组数 / 次数 / 重量请在「设置 → 训练计划」中调整。</p>
      </div>
    </div>

    <div v-else class="empty-state">
      <AppIcon name="book" :size="44" style="color: var(--text-tertiary)" />
      <div style="margin-top:12px">未找到该动作</div>
    </div>

    <!-- 编辑自定义动作面板 -->
    <ExerciseFormSheet v-if="editing && exercise" :exercise="exercise"
      @close="editing = false" @saved="editing = false" />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrainingStore } from '../stores/training'
import { SEED_ID_SET } from '../database/seed'
import { MUSCLE_GROUP_LABELS } from '../models'
import AppIcon from '../components/AppIcon.vue'
import ExerciseFormSheet from '../components/ExerciseFormSheet.vue'

const route = useRoute()
const router = useRouter()
const training = useTrainingStore()

const exercise = computed(() => {
  const id = route.params.id
  return training.allExercises.find(e => e.id === id)
})

// 表里有 = 自定义（内置 44 个 id 永远在 SEED 里），自定义才显示编辑/删除
const isCustom = computed(() => !SEED_ID_SET.has(route.params.id))
const editing = ref(false)

// 该动作是否在自定义计划中（在计划内 → 默认配置去设置页调整）
const inPlan = ref(false)

// 返回动作库
function goBack() {
  router.back()
}

// 删除自定义动作：断计划/默认值引用，训练记录保留（拍板决策），删完回列表停在"未找到"空态没有意义
async function onDelete() {
  if (!confirm('删除该动作？计划槽位与默认值将一并移除，训练记录保留（历史计时记录将按次数显示）。')) return
  try {
    await training.removeCustomExercise(exercise.value.id)
    router.back()
  } catch (e) {
    alert(e?.message || '删除失败，请重试')
  }
}

// 返回键由 App.vue 全局统一处理；顶部返回按钮走 goBack
onMounted(async () => {
  try {
    // 深链直达本页时 store 可能未初始化：init 幂等，含自定义动作与计划加载
    await training.init()
    const exId = exercise.value?.id
    if (exId) {
      inPlan.value = ['push', 'pull', 'legs'].some(dt =>
        (training.planByDay[dt] || []).some(s => s.exerciseId === exId)
      )
    }
  } catch (e) { /* 计划加载失败不阻塞页面 */ }
})
</script>

<style scoped>
.detail-wrap {
  /* 顶部安全区补偿：本页无 .page-header，安全区 padding 已迁移到标题块 */
  padding: calc(var(--sp-4) + var(--safe-top-real, env(safe-area-inset-top))) 16px 16px;
}
.detail-topbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.topbar-actions {
  display: flex;
  gap: 8px;
}
.back-btn.danger {
  color: var(--danger, #ef4444);
}
.back-btn.danger:hover {
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s var(--easing);
}
.back-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}
.back-icon {
  transform: rotate(180deg);
}
.detail-header {
  background: linear-gradient(135deg, var(--surface), var(--surface-hover));
  border: 1px solid var(--border-strong);
}
.detail-name {
  font-size: 21px;
  font-weight: 700;
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-muscle {
  background: var(--accent-dim);
  color: var(--accent-strong);
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
}
.tag-type {
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 20px;
}
.tag-type.machine {
  background: var(--success-dim);
  color: var(--success);
}
.tag-type.free {
  background: rgba(251, 191, 36, 0.12);
  color: var(--warning);
}
.demo-img {
  width: 100%;
  border-radius: var(--radius-md);
}
.video-wrap {
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.video-wrap iframe {
  width: 100%;
  height: 100%;
}
.steps-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary);
}
.card-tips {
  border-color: rgba(249, 115, 22, 0.25);
}
.card-warn {
  border-color: rgba(245, 158, 11, 0.2);
}
.config-moved {
  margin-top: 12px;
  border-color: rgba(249, 115, 22, 0.25);
}
.config-hint {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 4px 0 0;
}
</style>

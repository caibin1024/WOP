import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/today'
  },
  {
    path: '/today',
    name: 'today',
    component: () => import('../views/TodayView.vue'),
    meta: { title: '今日训练' }
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('../views/HistoryView.vue'),
    meta: { title: '训练记录' }
  },
  {
    path: '/history/:date',
    name: 'history-detail',
    component: () => import('../views/HistoryDetailView.vue'),
    meta: { title: '训练明细' }
  },
  {
    path: '/body',
    name: 'body',
    component: () => import('../views/BodyView.vue'),
    meta: { title: '身体数据' }
  },
  {
    path: '/aerobic',
    name: 'aerobic',
    component: () => import('../views/AerobicView.vue'),
    meta: { title: '有氧' }
  },
  {
    path: '/exercises',
    name: 'exercises',
    component: () => import('../views/ExerciseListView.vue'),
    meta: { title: '动作库' }
  },
  {
    path: '/exercises/:id',
    name: 'exercise-detail',
    component: () => import('../views/ExerciseDetailView.vue'),
    meta: { title: '动作教学' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: '设置' }
  },
  {
    path: '/ai',
    name: 'ai',
    component: () => import('../views/AiConsultView.vue'),
    meta: { title: 'AI 咨询' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.afterEach((to) => {
  const title = to.meta?.title
  if (title) {
    document.title = `${title} · WOP`
  }
})

export default router

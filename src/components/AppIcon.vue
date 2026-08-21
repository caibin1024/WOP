<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
       :aria-label="label" role="img">
    <template v-if="name === 'dumbbell'">
      <path d="M6.5 6.5l11 11" />
      <path d="M2.5 9.5l2-2 5 5-2 2z" />
      <path d="M19.5 14.5l-2 2-5-5 2-2z" />
      <path d="M6.5 6.5l-3 3" opacity=".4" />
      <path d="M17.5 17.5l3-3" opacity=".4" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </template>
    <template v-else-if="name === 'book'">
      <path d="M4 4h5a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5H4z" />
      <path d="M20 4h-5a3 3 0 00-3 3v13a2.5 2.5 0 012.5-2.5H20z" />
    </template>
    <template v-else-if="name === 'scale'">
      <path d="M12 3v3" />
      <path d="M9 6h6" />
      <path d="M6 9l-3 9h18l-3-9z" />
      <path d="M3 18h18" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </template>
    <template v-else-if="name === 'waves'">
      <path d="M2 7c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />
      <path d="M2 12c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />
      <path d="M2 17c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />
    </template>
    <template v-else-if="name === 'heart'">
      <!-- 心跳：心形 + 心电曲线，代表有氧 -->
      <path d="M12 20s-7-4.7-9-8.6A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 5C19 15.3 12 20 12 20z" />
      <path d="M7 12.2h2.4l1.4-2.6 1.9 4.4 1.3-1.8H17" />
    </template>
    <template v-else-if="name === 'stairs'">
      <!-- 楼梯：爬楼机 -->
      <path d="M22 5v11a1 1 0 0 1-1 1h-7" />
      <path d="M14 17v-7a1 1 0 0 0-1-1H5" />
      <path d="M6 21V9a1 1 0 0 1 1-1h2" />
      <path d="M4 21h16" />
    </template>
    <template v-else-if="name === 'treadmill'">
      <!-- 跑步机：履带 + 立柱 + 底座 -->
      <path d="M3 20h18" />
      <path d="M5 20V9a1 1 0 0 1 1-1h4v12" />
      <path d="M10 19h5v-6" />
      <path d="M15 13a2 2 0 0 0 2 2h.01" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h0a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="M4 12l5 5L20 6" />
    </template>
    <template v-else-if="name === 'export'">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </template>
    <template v-else-if="name === 'teach'">
      <path d="M2 5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
    </template>
    <template v-else-if="name === 'save'">
      <path d="M5 3h11l3 3v15a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M8 3v5h6V3" />
      <path d="M8 21v-6h8v6" />
    </template>
    <template v-else-if="name === 'timer'">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="M6 9l6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="M6 15l6-6 6 6" />
    </template>
    <template v-else-if="name === 'exchange'">
      <!-- 换动作：左右箭头 -->
      <path d="M16 3h4v4" />
      <path d="M4 20l16-16" />
      <path d="M20 16v4h-4" />
    </template>
    <template v-else-if="name === 'sparkles'">
      <!-- AI：四角星光 -->
      <path d="M9.9 2.9a.5.5 0 0 1 .9 0l1.1 3a.5.5 0 0 0 .3.3l3 1.1a.5.5 0 0 1 0 .9l-3 1.1a.5.5 0 0 0-.3.3l-1.1 3a.5.5 0 0 1-.9 0l-1.1-3a.5.5 0 0 0-.3-.3l-3-1.1a.5.5 0 0 1 0-.9l3-1.1a.5.5 0 0 0 .3-.3z" />
      <path d="M18.5 13.5l.6 1.7a.5.5 0 0 0 .3.3l1.7.6a.5.5 0 0 1 0 .9l-1.7.6a.5.5 0 0 0-.3.3l-.6 1.7a.5.5 0 0 1-.9 0l-.6-1.7a.5.5 0 0 0-.3-.3l-1.7-.6a.5.5 0 0 1 0-.9l1.7-.6a.5.5 0 0 0 .3-.3z" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="M9 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </template>
    <template v-else-if="name === 'pencil'">
      <path d="M17 3l4 4L7 21l-4 1 1-4z" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </template>
    <template v-else-if="name === 'fire'">
      <path d="M12 22c4.4 0 7-2.8 7-6.5 0-2.5-1.5-4.5-3-6-1-1-1.5-2.5-1.5-4-1.5 1.5-3.5 2-3.5 4.5 0 1-.5 1.5-1 2-.5-1-1-2-1-3.5C6.5 9 4 11.5 4 15.5 4 19.2 7.6 22 12 22z" />
      <path d="M12 22c-2 0-3-1.2-3-3 0-1.5 1-2.5 2-3.5.8-.8 1.5-2 1.5-3.5.8 1 1.5 2 1.5 3.5 0 1.8 1 2.5 2 3.5 1 .8 1.5 1.5 1.5 2.5 0 1.8-1.5 3-5.5 3z" opacity=".5" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 20 },
  label: { type: String, default: '' }
})
</script>

<template></template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useBackStack } from '../composables/useBackStack'

/**
 * 无渲染返回层：show 为真时注册到全局返回栈，返回键触发 emit('back') 由父级关浮层；
 * show 变假或组件卸载时自动出栈。用于把浮层/下钻/内联确认态纳入返回键。
 */
const props = defineProps({
  show: { type: Boolean, default: false }
})
const emit = defineEmits(['back'])

const stack = useBackStack()
let remove = null

function register() {
  remove = stack.push(() => emit('back'))
}
function unregister() {
  if (remove) {
    remove()
    remove = null
  }
}

watch(() => props.show, v => (v ? register() : unregister()), { immediate: true })
onBeforeUnmount(unregister)
</script>

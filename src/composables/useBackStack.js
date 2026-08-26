/**
 * 全局返回栈（模块级单例）
 * 每个「可被返回键关闭的层」（浮层/下钻面板/内联确认态）注册一个关闭回调；
 * App.vue 的唯一 backButton 入口从栈顶依次驱动关闭，栈空再走路由返回。
 * 组件卸载或层关闭时自动出栈，不会残留。
 */
const layers = [] // [{ id, onClose }]
let seq = 0

export function useBackStack() {
  /** 入栈一层，返回取消函数（层关闭/组件卸载时调用） */
  function push(onClose) {
    const id = ++seq
    layers.push({ id, onClose })
    return () => remove(id)
  }
  function remove(id) {
    const i = layers.findIndex(l => l.id === id)
    if (i >= 0) layers.splice(i, 1)
  }
  /** 关闭最上层返回层；成功返回 true */
  function closeTop() {
    const l = layers[layers.length - 1]
    if (!l) return false
    layers.pop()
    try {
      l.onClose()
    } catch (e) {
      console.error('返回层关闭失败', e)
    }
    return true
  }
  return {
    push,
    remove,
    closeTop,
    hasTop: () => layers.length > 0,
    clear: () => {
      layers.length = 0
    }
  }
}

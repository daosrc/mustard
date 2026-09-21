<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MIcon from './MIcon.vue'

const props = withDefaults(defineProps<{
  title?: string
  width?: string
  closeOnOverlay?: boolean
  /** 遮罩只覆盖最近的定位祖先（如侧边栏正文区），而非整个视口 */
  contained?: boolean
}>(), {
  width: '420px',
  closeOnOverlay: true,
  contained: false,
})

const open = defineModel<boolean>({ default: false })
const overlayEl = ref<HTMLElement>()
let scrollLockEl: HTMLElement | null = null

/** 打开时锁定底层滚动（最近的滚动容器；否则 body），只允许弹窗内部滚动 */
function lockBackgroundScroll(): void {
  let el = overlayEl.value?.parentElement ?? null
  while (el && el !== document.body) {
    const overflowY = getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') {
      scrollLockEl = el
      el.style.overflowY = 'hidden'
      return
    }
    el = el.parentElement
  }
  scrollLockEl = document.body
  document.body.style.overflow = 'hidden'
}

function unlockBackgroundScroll(): void {
  if (scrollLockEl) {
    scrollLockEl.style.overflowY = ''
    if (scrollLockEl === document.body)
      document.body.style.overflow = ''
    scrollLockEl = null
  }
}

/** contained 时把遮罩固定到定位祖先的视口区域（避免随内容滚动跑出可视区） */
function positionContainedOverlay(): void {
  const el = overlayEl.value
  if (!el || !props.contained)
    return
  let anc: HTMLElement | null = el.parentElement
  while (anc && getComputedStyle(anc).position === 'static')
    anc = anc.parentElement
  if (!anc)
    return
  const r = anc.getBoundingClientRect()
  el.style.position = 'fixed'
  el.style.top = `${r.top}px`
  el.style.left = `${r.left}px`
  el.style.width = `${r.width}px`
  el.style.height = `${r.height}px`
}

function resetOverlayPosition(): void {
  const el = overlayEl.value
  if (!el)
    return
  el.style.position = ''
  el.style.top = ''
  el.style.left = ''
  el.style.width = ''
  el.style.height = ''
}

function onViewportChange(): void {
  if (open.value)
    positionContainedOverlay()
}

watch(open, (isOpen) => {
  if (isOpen) {
    void nextTick(() => {
      lockBackgroundScroll()
      positionContainedOverlay()
    })
  }
  else {
    unlockBackgroundScroll()
    resetOverlayPosition()
  }
})

function close() {
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value)
    close()
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onViewportChange)
  unlockBackgroundScroll()
})
</script>

<template>
  <Transition
    name="m-dialog"
    @after-enter="lockBackgroundScroll(); positionContainedOverlay()"
    @after-leave="unlockBackgroundScroll(); resetOverlayPosition()"
  >
    <div v-if="open" ref="overlayEl" class="overlay" :class="{ 'is-contained': contained }" @click.self="closeOnOverlay && close()">
      <div class="panel" role="dialog" aria-modal="true" :style="{ width }">
        <header class="head">
          <span class="title"><slot name="title">{{ title }}</slot></span>
          <button class="x" type="button" title="关闭" @click="close">
            <MIcon name="close" :size="16" />
          </button>
        </header>
        <div class="body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 30, 14, .42);
}
/* contained：遮罩只覆盖最近的定位祖先（侧边栏正文区），由 positionContainedOverlay 定位 */
.overlay.is-contained {
  position: absolute;
}
.overlay.is-contained .panel { max-height: calc(100% - 32px); }
.panel {
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--m-surface);
  color: var(--m-ink);
  border: 1px solid var(--m-line);
  border-radius: 16px;
  box-shadow: var(--m-shadow-lg);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--m-line);
}
.title { font-size: 14px; font-weight: 650; }
.x {
  border: 0;
  padding: 4px;
  border-radius: 7px;
  background: transparent;
  color: var(--m-muted);
  cursor: pointer;
  display: inline-flex;
}
.x:hover { background: var(--m-surface-2); color: var(--m-ink); }
.body { padding: 16px; overflow-y: auto; font-size: 13px; line-height: 1.6; }
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--m-line);
}

.m-dialog-enter-active,
.m-dialog-leave-active { transition: opacity .18s ease; }
.m-dialog-enter-active .panel,
.m-dialog-leave-active .panel { transition: transform .18s cubic-bezier(.34, 1.4, .64, 1), opacity .18s ease; }
.m-dialog-enter-from,
.m-dialog-leave-to { opacity: 0; }
.m-dialog-enter-from .panel,
.m-dialog-leave-to .panel { transform: translateY(8px) scale(.97); opacity: 0; }
</style>

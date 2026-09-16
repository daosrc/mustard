<script setup lang="ts">
import type { TranslateResult } from '@mustard/core/translation'
import type { Settings } from '@mustard/shared'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { addToVocab, translate } from './actions'

interface TipState {
  x: number
  y: number
  text: string
  loading: boolean
  result: TranslateResult | null
  added: boolean
}

const props = defineProps<{ settings: Settings | null }>()
const emit = defineEmits<{ added: [] }>()

const tooltip = ref<TipState | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let lastKey = ''
let token = 0

function inOurUi(event: Event): boolean {
  return event.composedPath().some(node => (node as HTMLElement)?.classList?.contains('mustard-wrap'))
}

function extractWord(data: string, offset: number): string {
  const re = /[\p{L}\p{N}'-]+/gu
  let match = re.exec(data)
  while (match) {
    const start = match.index
    const end = start + match[0].length
    if (offset >= start && offset <= end)
      return match[0]
    if (start > offset)
      break
    match = re.exec(data)
  }
  return ''
}

function extractSentence(data: string, offset: number): string {
  const boundary = (c: string | undefined): boolean => !!c && /[.!?。！？\n]/.test(c)
  let start = offset
  while (start > 0 && !boundary(data[start - 1]))
    start--
  let end = offset
  while (end < data.length && !boundary(data[end]))
    end++
  return data.slice(start, end).trim()
}

function scheduleHide(ms = 140): void {
  clearTimeout(timer)
  timer = setTimeout(() => {
    tooltip.value = null
    lastKey = ''
  }, ms)
}

function cancelHide(): void {
  clearTimeout(timer)
}

async function show(value: string, x: number, y: number): Promise<void> {
  const current = ++token
  tooltip.value = { x, y, text: value, loading: true, result: null, added: false }
  try {
    const result = await translate(value, props.settings)
    if (current !== token)
      return
    tooltip.value = { ...tooltip.value!, loading: false, result }
    if (!result.text && !result.card)
      scheduleHide(0)
  }
  catch {
    if (current === token)
      scheduleHide(0)
  }
}

function onMouseMove(event: MouseEvent): void {
  if (!props.settings?.features.hoverTranslate) {
    if (tooltip.value)
      scheduleHide()
    return
  }
  if (inOurUi(event))
    return

  const range = (document as any).caretRangeFromPoint?.(event.clientX, event.clientY)
  const node = range?.startContainer
  if (!range || !node || node.nodeType !== Node.TEXT_NODE) {
    if (tooltip.value)
      scheduleHide()
    return
  }

  const data = (node as Text).data
  const scope = props.settings.hover.scope
  const value = scope === 'word' ? extractWord(data, range.startOffset) : extractSentence(data, range.startOffset)
  if (!value || value.length > 300 || value === lastKey)
    return

  lastKey = value
  clearTimeout(timer)
  const delay = props.settings.hover.delay
  timer = setTimeout(show, delay, value, event.clientX, event.clientY)
}

async function onAdd(): Promise<void> {
  const tip = tooltip.value
  if (!tip || !tip.result || tip.added)
    return
  await addToVocab(tip.text, tip.result, props.settings)
  tip.added = true
  emit('added')
}

function onScroll(): void {
  if (tooltip.value)
    scheduleHide(0)
}

onMounted(() => {
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('scroll', onScroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<template>
  <div
    v-if="tooltip"
    class="hover-tip"
    :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    @pointerenter="cancelHide"
    @pointerleave="scheduleHide()"
  >
    <div v-if="tooltip.loading" class="ht-loading">
      查询中…
    </div>
    <template v-else>
      <div class="ht-text">
        {{ tooltip.result?.card?.translation ?? tooltip.result?.text }}
      </div>
      <div class="ht-foot">
        <span class="ht-word">{{ tooltip.text }}</span>
        <button class="ht-btn" :class="{ done: tooltip.added }" :disabled="tooltip.added" @click="onAdd">
          {{ tooltip.added ? '已加入' : '加入生词本' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.hover-tip {
  position: fixed;
  z-index: 2147483647;
  transform: translate(-50%, 0);
  max-width: 300px;
  background: var(--m-surface);
  color: var(--m-ink);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  box-shadow: var(--m-shadow-md);
  padding: 8px 10px;
  font-size: 12.5px;
  line-height: 1.5;
}
.ht-loading { color: var(--m-muted); }
.ht-text { word-break: break-word; }
.ht-foot { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ht-word { flex: 1; min-width: 0; color: var(--m-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ht-btn {
  border: 0; border-radius: 7px; padding: 4px 8px;
  background: var(--m-primary-soft); color: var(--m-primary);
  font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.ht-btn.done { background: var(--m-surface-2); color: var(--m-muted); cursor: default; }
</style>

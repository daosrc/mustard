<script setup lang="ts">
import type { TranslateResult } from '@mustard/core/translation'
import type { Settings } from '@mustard/shared'
import { t as translateKey } from '@mustard/shared'
import { MIcon } from '@mustard/ui'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { addToVocab, isWord, speakText, translate, translateAi } from './actions'

interface TipState {
  x: number
  y: number
  text: string
  loading: boolean
  result: TranslateResult | null
  ai?: string
  added: boolean
  dx?: number
  dy?: number
}

const props = defineProps<{ settings: Settings | null }>()
const emit = defineEmits<{ added: [] }>()

function t(key: string): string {
  return translateKey(props.settings?.uiLang ?? 'zh', key)
}

const tooltip = ref<TipState | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
let aiTimer: ReturnType<typeof setTimeout> | undefined
let lastKey = ''
let token = 0

function inOurUi(event: Event): boolean {
  return event.composedPath().some(node => (node as HTMLElement)?.classList?.contains('mustard-wrap'))
}

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
  ? new Intl.Segmenter(undefined, { granularity: 'word' })
  : null

function extractWord(data: string, offset: number): string {
  if (segmenter) {
    for (const seg of segmenter.segment(data)) {
      if (!seg.isWordLike)
        continue
      if (offset >= seg.index && offset <= seg.index + seg.segment.length)
        return seg.segment
      if (seg.index > offset)
        break
    }
  }
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
  clearTimeout(aiTimer)
  timer = setTimeout(() => {
    tooltip.value = null
    lastKey = ''
  }, ms)
}

function cancelHide(): void {
  clearTimeout(timer)
}

async function clampTip(): Promise<void> {
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  const el = document.querySelector('mustard-root')?.shadowRoot?.querySelector('.hover-tip') as HTMLElement | null
  if (!el || !tooltip.value)
    return
  const r = el.getBoundingClientRect()
  const pad = 8
  let dx = 0
  let dy = 0
  if (r.left < pad)
    dx = pad - r.left
  else if (r.right > window.innerWidth - pad)
    dx = window.innerWidth - pad - r.right
  if (r.bottom > window.innerHeight - pad)
    dy = window.innerHeight - pad - r.bottom
  tooltip.value.dx = dx
  tooltip.value.dy = dy
}

function isOverChar(node: Text, offset: number, x: number, y: number): boolean {
  const len = node.data.length
  if (!len)
    return false
  const check = (index: number): boolean => {
    if (index < 0 || index >= len)
      return false
    const range = document.createRange()
    range.setStart(node, index)
    range.setEnd(node, index + 1)
    for (const rect of range.getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
        return true
    }
    return false
  }
  return check(offset) || check(offset - 1)
}

async function show(value: string, x: number, y: number): Promise<void> {
  lastKey = value
  const current = ++token
  tooltip.value = { x, y, text: value, loading: true, result: null, added: false }
  try {
    const result = await translate(value, props.settings)
    if (current !== token)
      return
    tooltip.value = { ...tooltip.value!, loading: false, result }
    void clampTip()
    if (result.card) {
      // 命中词典：3s 后若悬浮仍在，追加 AI 翻译
      clearTimeout(aiTimer)
      aiTimer = setTimeout(async () => {
        if (current !== token || !tooltip.value)
          return
        try {
          const ai = await translateAi(value, props.settings)
          if (current === token && tooltip.value)
            tooltip.value.ai = ai.card?.translation || ai.text || ''
        }
        catch {
          // 忽略
        }
      }, 3000)
      return
    }
    // 词典未命中：单词直接 AI
    if (isWord(value)) {
      try {
        const ai = await translateAi(value, props.settings)
        if (current !== token || !tooltip.value)
          return
        if (ai.card)
          tooltip.value.result = ai
        else if (ai.text)
          tooltip.value.ai = ai.text
        if (!ai.card && !ai.text)
          scheduleHide(0)
      }
      catch {
        if (current === token)
          scheduleHide(0)
      }
      return
    }
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
    clearTimeout(timer)
    if (tooltip.value)
      scheduleHide()
    return
  }

  const offset = range.startOffset
  // 必须真正落在字符上，行间空白/行尾外侧不触发
  if (!isOverChar(node as Text, offset, event.clientX, event.clientY)) {
    clearTimeout(timer)
    if (tooltip.value)
      scheduleHide()
    return
  }

  const data = (node as Text).data
  const scope = props.settings.hover.scope
  const value = scope === 'word' ? extractWord(data, offset) : extractSentence(data, offset)
  if (!value || value.length > 300) {
    clearTimeout(timer)
    if (tooltip.value)
      scheduleHide()
    return
  }
  if (value === lastKey)
    return

  // 鼠标停稳 delay 毫秒后才触发，移动过程中不断重置
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
    :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: `translate(calc(-50% + ${tooltip.dx ?? 0}px), ${tooltip.dy ?? 0}px)` }"
    @pointerenter="cancelHide"
    @pointerleave="scheduleHide()"
  >
    <div v-if="tooltip.loading" class="ht-loading">
      {{ t('content.searching') }}
    </div>
    <template v-else>
      <div class="ht-title">
        {{ tooltip.text }}
      </div>
      <div class="ht-text">
        {{ tooltip.result?.card?.translation ?? tooltip.result?.text }}
      </div>
      <div v-if="tooltip.ai" class="ht-ai">
        <span class="ht-ai-tag">AI</span>{{ tooltip.ai }}
      </div>
      <div class="ht-foot">
        <span class="ht-word">{{ tooltip.text }}</span>
        <button class="ht-icon" :title="t('content.speak')" @click="speakText(tooltip.text, props.settings)">
          <MIcon name="speaker" :size="14" />
        </button>
        <button class="ht-btn" :class="{ done: tooltip.added }" :disabled="tooltip.added" @click="onAdd">
          {{ tooltip.added ? t('content.added') : t('content.addVocab') }}
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
.ht-title { font-weight: 700; font-size: 14px; margin-bottom: 3px; }
.ht-text { word-break: break-word; }
.ht-ai { margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--m-line); }
.ht-ai-tag { display: inline-block; font-size: 10px; font-weight: 700; color: var(--m-primary); border: 1px solid var(--m-primary); border-radius: 5px; padding: 0 4px; margin-right: 6px; }
.ht-foot { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.ht-icon {
  border: 0; padding: 3px; border-radius: 6px;
  background: transparent; color: var(--m-muted);
  display: inline-flex; cursor: pointer; flex: none;
}
.ht-icon:hover { background: var(--m-surface-2); color: var(--m-ink); }
.ht-word { flex: 1; min-width: 0; color: var(--m-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ht-btn {
  border: 0; border-radius: 7px; padding: 4px 8px;
  background: var(--m-primary-soft); color: var(--m-primary);
  font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.ht-btn.done { background: var(--m-surface-2); color: var(--m-muted); cursor: default; }
</style>

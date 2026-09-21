<script setup lang="ts">
import type { TranslateResult } from '@mustard/core/translation'
import type { Settings } from '@mustard/shared'
import { hasOfflineDictFor, t as translateKey } from '@mustard/shared'
import { MIcon } from '@mustard/ui'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { addToVocab, isWord, speakText, translate, translateAi } from './actions'

const props = defineProps<{ settings: Settings | null }>()
const emit = defineEmits<{ added: [] }>()

function t(key: string): string {
  return translateKey(props.settings?.uiLang ?? 'zh', key)
}

/** 结果为空时的提示：优先说明「该语言没有离线词典」，避免只显示「未找到」 */
const emptyHint = computed(() => {
  const settings = props.settings
  if (!settings)
    return t('content.notFound')
  if (hasOfflineDictFor(settings.dictionaries, settings.targetLang))
    return t('content.notFound')
  const provider = settings.providers.find(p => p.id === settings.activeProviderId)
  return provider?.apiKey ? t('content.notFound') : t('content.noDict')
})

function sourceLabel(source: string): string {
  if (source.startsWith('local'))
    return t('content.sourceLocal')
  if (source === 'online')
    return t('content.sourceOnline')
  if (source === 'ai')
    return t('content.sourceAi')
  return ''
}

const icon = ref<{ x: number, y: number } | null>(null)
const popover = ref<{ x: number, y: number } | null>(null)
const text = ref('')
const loading = ref(false)
const result = ref<TranslateResult | null>(null)
const aiText = ref('')
const added = ref(false)
const popEl = ref<HTMLElement>()
const popOffset = ref({ dx: 0, dy: 0 })
let aiTimer: ReturnType<typeof setTimeout> | undefined

/** 测量弹框后把偏移钳制在视口内，避免贴边被裁切 */
async function clampPopover(): Promise<void> {
  await nextTick()
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  const el = popEl.value
  if (!el)
    return
  const r = el.getBoundingClientRect()
  const pad = 8
  let dx = 0
  let dy = 0
  if (r.left < pad)
    dx = pad - r.left
  else if (r.right > window.innerWidth - pad)
    dx = window.innerWidth - pad - r.right
  if (r.top < pad)
    dy = pad - r.top
  else if (r.bottom > window.innerHeight - pad)
    dy = window.innerHeight - pad - r.bottom
  popOffset.value = { dx, dy }
}

function inOurUi(event: Event): boolean {
  return event.composedPath().some(node => (node as HTMLElement)?.classList?.contains('mustard-wrap'))
}

function clear(): void {
  clearTimeout(aiTimer)
  icon.value = null
  popover.value = null
  text.value = ''
  loading.value = false
  result.value = null
  aiText.value = ''
  added.value = false
}

function onMouseUp(event: MouseEvent): void {
  if (!props.settings?.features.selectionTranslate || inOurUi(event))
    return
  setTimeout(() => {
    const selection = window.getSelection()
    const value = selection?.toString().trim() ?? ''
    if (!selection || selection.rangeCount === 0 || !value || value.length > 300) {
      icon.value = null
      return
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect()
    if (!rect.width && !rect.height) {
      icon.value = null
      return
    }
    text.value = value
    icon.value = { x: rect.left + rect.width / 2, y: rect.top - 8 }
  }, 0)
}

function onMouseDown(event: MouseEvent): void {
  if (popover.value && !inOurUi(event))
    clear()
}

function onScroll(): void {
  if (icon.value || popover.value)
    clear()
}

async function openPopover(): Promise<void> {
  if (!text.value)
    return
  const value = text.value
  popover.value = { x: icon.value?.x ?? window.innerWidth / 2, y: icon.value?.y ?? 120 }
  popOffset.value = { dx: 0, dy: 0 }
  icon.value = null
  loading.value = true
  result.value = null
  aiText.value = ''
  added.value = false
  clearTimeout(aiTimer)
  try {
    result.value = await translate(value, props.settings)
    const card = result.value?.card
    if (card) {
      // 命中词典：3s 后若弹框仍打开，追加 AI 翻译
      aiTimer = setTimeout(async () => {
        if (!popover.value || text.value !== value)
          return
        try {
          const ai = await translateAi(value, props.settings)
          aiText.value = ai.card?.translation || ai.text || ''
        }
        catch {
          // 忽略 AI 失败
        }
      }, 3000)
    }
    else if (isWord(value)) {
      // 词典未命中：直接 AI
      try {
        const ai = await translateAi(value, props.settings)
        if (ai.card)
          result.value = ai
        else if (ai.text)
          aiText.value = ai.text
      }
      catch {
        // 忽略
      }
    }
  }
  finally {
    loading.value = false
    void clampPopover()
  }
}

async function onAdd(): Promise<void> {
  if (!result.value || added.value)
    return
  await addToVocab(text.value, result.value, props.settings)
  added.value = true
  emit('added')
}

function copy(): void {
  void navigator.clipboard?.writeText(result.value?.card?.translation ?? result.value?.text ?? '')
}

onMounted(() => {
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('scroll', onScroll, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('mousedown', onMouseDown)
  document.removeEventListener('scroll', onScroll, true)
})
</script>

<template>
  <button
    v-if="icon"
    class="sel-icon"
    :style="{ left: `${icon.x}px`, top: `${icon.y}px` }"
    :title="t('content.translate')"
    @mousedown.prevent
    @click="openPopover"
  >
    <MIcon name="translate" :size="16" />
  </button>

  <div
    v-if="popover"
    ref="popEl"
    class="sel-pop"
    :style="{ left: `${popover.x}px`, top: `${popover.y}px`, transform: `translate(calc(-50% + ${popOffset.dx}px), calc(-100% + ${popOffset.dy}px))` }"
  >
    <header class="pop-head">
      <span class="pop-word">{{ result?.card?.word ?? text }}</span>
      <button class="pop-btn" :title="t('content.speak')" @click="speakText(text, props.settings)">
        <MIcon name="speaker" :size="15" />
      </button>
      <button class="pop-btn" :title="t('content.copy')" @click="copy">
        <MIcon name="copy" :size="15" />
      </button>
      <button class="pop-btn" :title="t('content.close')" @click="clear">
        <MIcon name="close" :size="15" />
      </button>
    </header>

    <div v-if="loading" class="pop-loading">
      {{ t('content.searching') }}
    </div>
    <div v-else-if="!result || (!result.text && !result.card)" class="pop-empty">
      {{ emptyHint }}
    </div>
    <template v-else>
      <div v-if="result.card?.phonetic || result.card?.partOfSpeech || result.card?.source" class="pop-meta">
        <span v-if="result.card?.phonetic" class="pop-phonetic">{{ result.card.phonetic }}</span>
        <span v-if="result.card?.partOfSpeech" class="pop-pos">{{ result.card.partOfSpeech }}</span>
        <span v-if="result.card?.source" class="pop-src">{{ sourceLabel(result.card.source) }}</span>
      </div>
      <div class="pop-trans">
        {{ result.card?.translation ?? result.text }}
      </div>
      <div v-if="aiText" class="pop-ai">
        <span class="pop-ai-tag">AI</span>{{ aiText }}
      </div>
      <ul v-if="result.card?.examples?.length" class="pop-examples">
        <li v-for="(example, i) in result.card.examples" :key="i">
          {{ example }}
        </li>
      </ul>
      <footer class="pop-foot">
        <button class="pop-add" :class="{ done: added }" :disabled="added" @click="onAdd">
          <MIcon :name="added ? 'check' : 'plus'" :size="14" />
          {{ added ? t('content.added') : t('content.addVocab') }}
        </button>
      </footer>
    </template>
  </div>
</template>

<style scoped>
.sel-icon {
  position: fixed;
  z-index: 2147483647;
  transform: translate(-50%, -100%);
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: var(--m-primary);
  color: var(--m-primary-ink);
  box-shadow: var(--m-shadow-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sel-pop {
  position: fixed;
  z-index: 2147483647;
  transform: translate(-50%, -100%);
  width: 300px;
  max-width: calc(100vw - 24px);
  background: var(--m-surface);
  color: var(--m-ink);
  border: 1px solid var(--m-line);
  border-radius: 12px;
  box-shadow: var(--m-shadow-lg);
  padding: 10px 12px 8px;
  font-size: 13px;
}
.pop-head { display: flex; align-items: center; gap: 6px; }
.pop-word { font-weight: 700; font-size: 15px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pop-btn { border: 0; padding: 4px; border-radius: 7px; background: transparent; color: var(--m-muted); display: inline-flex; cursor: pointer; }
.pop-btn:hover { background: var(--m-surface-2); color: var(--m-ink); }
.pop-loading, .pop-empty { color: var(--m-muted); padding: 8px 0; }
.pop-meta { display: flex; align-items: baseline; gap: 8px; color: var(--m-muted); font-size: 12px; margin-top: 4px; }
.pop-src { margin-left: auto; font-size: 10px; color: var(--m-faint); border: 1px solid var(--m-line); border-radius: 6px; padding: 0 4px; }
.pop-ai { margin-top: 6px; padding-top: 6px; border-top: 1px dashed var(--m-line); line-height: 1.6; color: var(--m-ink); }
.pop-ai-tag { display: inline-block; font-size: 10px; font-weight: 700; color: var(--m-primary); border: 1px solid var(--m-primary); border-radius: 5px; padding: 0 4px; margin-right: 6px; }
.pop-trans { margin-top: 6px; line-height: 1.6; }
.pop-examples { margin: 6px 0 0; padding-left: 18px; color: var(--m-muted); font-size: 12px; }
.pop-foot { display: flex; justify-content: flex-end; margin-top: 8px; }
.pop-add {
  display: inline-flex; align-items: center; gap: 5px;
  border: 0; border-radius: 8px; padding: 5px 10px;
  background: var(--m-primary-soft); color: var(--m-primary);
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.pop-add.done { background: var(--m-surface-2); color: var(--m-muted); cursor: default; }
</style>

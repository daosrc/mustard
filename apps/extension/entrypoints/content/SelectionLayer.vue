<script setup lang="ts">
import type { TranslateResult } from '@mustard/core/translation'
import type { Settings } from '@mustard/shared'
import { t as translateKey } from '@mustard/shared'
import { MIcon } from '@mustard/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { addToVocab, speakText, translate } from './actions'

const props = defineProps<{ settings: Settings | null }>()
const emit = defineEmits<{ added: [] }>()

function t(key: string): string {
  return translateKey(props.settings?.uiLang ?? 'zh', key)
}

const icon = ref<{ x: number, y: number } | null>(null)
const popover = ref<{ x: number, y: number } | null>(null)
const text = ref('')
const loading = ref(false)
const result = ref<TranslateResult | null>(null)
const added = ref(false)

function inOurUi(event: Event): boolean {
  return event.composedPath().some(node => (node as HTMLElement)?.classList?.contains('mustard-wrap'))
}

function clear(): void {
  icon.value = null
  popover.value = null
  text.value = ''
  loading.value = false
  result.value = null
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
  popover.value = { x: icon.value?.x ?? window.innerWidth / 2, y: icon.value?.y ?? 120 }
  icon.value = null
  loading.value = true
  result.value = null
  added.value = false
  try {
    result.value = await translate(text.value, props.settings)
  }
  finally {
    loading.value = false
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

  <div v-if="popover" class="sel-pop" :style="{ left: `${popover.x}px`, top: `${popover.y}px` }">
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
      {{ t('content.notFound') }}
    </div>
    <template v-else>
      <div v-if="result.card?.phonetic || result.card?.partOfSpeech" class="pop-meta">
        <span v-if="result.card?.phonetic" class="pop-phonetic">{{ result.card.phonetic }}</span>
        <span v-if="result.card?.partOfSpeech" class="pop-pos">{{ result.card.partOfSpeech }}</span>
      </div>
      <div class="pop-trans">
        {{ result.card?.translation ?? result.text }}
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

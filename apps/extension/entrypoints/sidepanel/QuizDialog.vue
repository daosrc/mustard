<script setup lang="ts">
import type { Streak, WordEntry } from '@mustard/shared'
import { send } from '@mustard/platform'
import { MASTERED_STREAK } from '@mustard/shared'
import { MButton, MDialog, MIcon } from '@mustard/ui'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '../../lib/i18n'
import { speak } from '../../lib/speech'

const props = defineProps<{ entries: WordEntry[] }>()
const emit = defineEmits<{ done: [] }>()
const open = defineModel<boolean>({ default: false })
const { t } = useI18n()
const queue = ref<WordEntry[]>([])
const review = ref(false)
const index = ref(0)
const phase = ref<'view' | 'write'>('view')
const answer = ref('')
const feedback = ref<{ ok: boolean, text: string } | null>(null)
const correctIds = ref<Set<string>>(new Set())
const finished = ref(false)
const inputEl = ref<HTMLInputElement>()

const current = computed(() => queue.value[index.value])

function init(): void {
  const unmastered = props.entries
    .filter(e => e.streak < MASTERED_STREAK)
    .sort((a, b) => a.streak - b.streak || a.createdAt - b.createdAt)
  review.value = unmastered.length === 0
  queue.value = (review.value ? [...props.entries] : unmastered).map(e => ({ ...e }))
  index.value = 0
  phase.value = 'view'
  answer.value = ''
  feedback.value = null
  correctIds.value = new Set()
  finished.value = false
  speakWord()
}

watch(open, (isOpen) => {
  if (isOpen)
    init()
  else
    emit('done')
})

watch(phase, (value) => {
  if (value === 'write')
    void nextTick(() => inputEl.value?.focus())
})

function speakWord(): void {
  if (current.value)
    speak(current.value.word, current.value.sourceLang)
}

function allCorrect(): boolean {
  return queue.value.every(e => correctIds.value.has(e.id))
}

function go(nextIndex: number): void {
  index.value = nextIndex
  phase.value = 'view'
  answer.value = ''
  feedback.value = null
  speakWord()
}

function next(): void {
  if (index.value < queue.value.length - 1)
    go(index.value + 1)
}

function prev(): void {
  if (index.value > 0)
    go(index.value - 1)
}

async function verify(): Promise<void> {
  const entry = current.value
  if (!entry)
    return
  const ok = answer.value.trim().toLowerCase() === entry.word.trim().toLowerCase()
  if (ok) {
    correctIds.value.add(entry.id)
    if (!review.value) {
      entry.streak = Math.min(MASTERED_STREAK, entry.streak + 1) as Streak
      entry.updatedAt = Date.now()
      await send({ type: 'UPDATE_VOCAB', payload: entry })
    }
    if (index.value < queue.value.length - 1) {
      feedback.value = { ok: true, text: t('quiz.correct') }
      next()
      return
    }
    feedback.value = { ok: true, text: review.value ? t('quiz.reviewDone') : t('quiz.correctLast') }
    phase.value = 'view'
    if (review.value || allCorrect())
      finished.value = true
    return
  }

  if (!review.value) {
    entry.streak = 0
    entry.updatedAt = Date.now()
    await send({ type: 'UPDATE_VOCAB', payload: entry })
  }
  feedback.value = { ok: false, text: t('quiz.wrong', { word: entry.word }) }
  phase.value = 'view'
}
</script>

<template>
  <MDialog v-model="open" :title="queue.length ? t('quiz.title', { n: queue.length }) : t('quiz.titleEmpty')" width="420px">
    <div v-if="finished" class="q-done">
      <MIcon name="check" :size="30" />
      <p>{{ t('quiz.done', { n: queue.length }) }}</p>
      <MButton @click="open = false">
        {{ t('quiz.close') }}
      </MButton>
    </div>

    <div v-else-if="current" class="q-body">
      <div class="q-word">
        <span v-if="phase === 'view'" class="q-text">{{ current.word }}</span>
        <span v-else class="q-mask">•••••</span>
        <button class="icon-btn" :title="t('quiz.play')" @click="speakWord">
          <MIcon name="speaker" :size="17" />
        </button>
      </div>
      <div class="q-trans">
        {{ current.translation }}
      </div>

      <input
        v-if="phase === 'write'"
        ref="inputEl"
        v-model="answer"
        class="m-input q-input"
        :placeholder="t('quiz.write')"
        autocomplete="off"
        @keydown.enter.prevent="verify"
      >

      <p v-if="feedback" class="q-feedback" :class="{ ok: feedback.ok }">
        {{ feedback.text }}
      </p>

      <div class="q-foot">
        <button class="q-nav" :disabled="index === 0" :title="t('quiz.prev')" @click="prev">
          <MIcon name="chevron-left" :size="16" />
        </button>
        <MButton v-if="phase === 'view'" @click="phase = 'write'">
          {{ t('quiz.spell') }}
        </MButton>
        <MButton v-else @click="verify">
          {{ t('quiz.verify') }}
        </MButton>
        <button class="q-nav" :disabled="index >= queue.length - 1" :title="t('quiz.next')" @click="next">
          <MIcon name="chevron-right" :size="16" />
        </button>
      </div>

      <p class="q-progress">
        {{ index + 1 }} / {{ queue.length }}<span v-if="review">{{ t('quiz.reviewMode') }}</span>
      </p>
    </div>

    <p v-else class="m-muted">
      {{ t('quiz.empty') }}
    </p>
  </MDialog>
</template>

<style scoped>
.q-body { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 6px 0; }
.q-word { display: flex; align-items: center; gap: 8px; }
.q-text { font-size: 26px; font-weight: 700; letter-spacing: .5px; }
.q-mask { font-size: 26px; color: var(--m-faint); letter-spacing: 2px; }
.q-trans { color: var(--m-muted); font-size: 13px; text-align: center; }
.q-input { text-align: center; font-size: 15px; }
.q-feedback { font-size: 12.5px; margin: 0; }
.q-feedback.ok { color: var(--m-primary); }
.q-feedback:not(.ok) { color: var(--m-blush); }
.q-foot { display: flex; align-items: center; gap: 12px; }
.q-nav {
  border: 1px solid var(--m-line);
  border-radius: 8px;
  padding: 6px;
  background: var(--m-surface);
  color: var(--m-muted);
  display: inline-flex;
  cursor: pointer;
}
.q-nav:hover:not(:disabled) { border-color: var(--m-primary); color: var(--m-primary); }
.q-nav:disabled { opacity: .35; cursor: not-allowed; }
.q-progress { font-size: 11.5px; color: var(--m-muted); margin: 0; }
.q-done { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 18px 0; color: var(--m-primary); }
.q-done p { margin: 0; color: var(--m-ink); }
.icon-btn {
  border: 0; padding: 4px; border-radius: 7px;
  background: transparent; color: var(--m-muted);
  display: inline-flex; cursor: pointer;
}
.icon-btn:hover { background: var(--m-surface-2); color: var(--m-ink); }
</style>

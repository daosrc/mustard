<script setup lang="ts">
import type { WordEntry } from '@mustard/shared'
import { send } from '@mustard/platform'
import { MASTERED_STREAK } from '@mustard/shared'
import { MButton, MChip, MIcon, MSelect, MStars, useToast } from '@mustard/ui'
import { computed, onMounted, ref } from 'vue'
import { speak } from '../../lib/speech'
import QuizDialog from './QuizDialog.vue'

const emit = defineEmits<{ changed: [] }>()
const { success, error } = useToast()

const entries = ref<WordEntry[]>([])
const query = ref('')
const filter = ref<string>('all')
const fileEl = ref<HTMLInputElement>()
const quizOpen = ref(false)
const pendingCount = computed(() => entries.value.filter(e => e.streak < MASTERED_STREAK).length)

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '练习中', value: 'learning' },
  { label: '已掌握', value: 'mastered' },
]

async function load(): Promise<void> {
  entries.value = await send({ type: 'GET_VOCAB' })
  emit('changed')
}

onMounted(load)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return entries.value
    .filter(e => filter.value === 'all'
      || (filter.value === 'mastered' ? e.streak >= MASTERED_STREAK : e.streak < MASTERED_STREAK))
    .filter(e => !q || e.word.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q))
})

const stats = computed(() => {
  const mastered = entries.value.filter(e => e.streak >= MASTERED_STREAK).length
  return { total: entries.value.length, mastered, learning: entries.value.length - mastered }
})

async function remove(entry: WordEntry): Promise<void> {
  await send({ type: 'REMOVE_VOCAB', payload: { id: entry.id } })
  await load()
}

async function exportVocab(format: 'json' | 'csv'): Promise<void> {
  const { data, filename } = await send({ type: 'EXPORT_VOCAB', payload: { format } })
  const url = URL.createObjectURL(new Blob([data], {
    type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8',
  }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  success('已导出')
}

function pickImport(): void {
  fileEl.value?.click()
}

async function onImportFile(event: Event): Promise<void> {
  const el = event.target as HTMLInputElement
  const file = el.files?.[0]
  el.value = ''
  if (!file)
    return
  try {
    const data = await file.text()
    const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json'
    const result = await send({ type: 'IMPORT_VOCAB', payload: { format, data } })
    success(`已导入 ${result.imported} 条，共 ${result.total} 条`)
    await load()
  }
  catch {
    error('导入失败：文件格式无效')
  }
}
</script>

<template>
  <div class="vocab">
    <div class="v-toolbar">
      <input v-model="query" class="m-input search" placeholder="搜索单词或释义…">
      <MSelect v-model="filter" :options="filterOptions" size="sm" class="filter" />
    </div>

    <div class="v-actions">
      <MButton :disabled="!entries.length" @click="quizOpen = true">
        <MIcon name="sparkles" :size="14" />
        记词 {{ pendingCount }}
      </MButton>
      <MButton variant="ghost" @click="exportVocab('json')">
        <MIcon name="download" :size="14" />
        JSON
      </MButton>
      <MButton variant="ghost" @click="exportVocab('csv')">
        <MIcon name="download" :size="14" />
        CSV
      </MButton>
      <MButton variant="ghost" @click="pickImport">
        <MIcon name="upload" :size="14" />
        导入
      </MButton>
      <input ref="fileEl" class="hidden-file" type="file" accept=".json,.csv,application/json,text/csv" @change="onImportFile">
    </div>

    <div class="v-list">
      <p v-if="!filtered.length" class="v-empty">
        {{ entries.length ? '没有匹配的词条。' : '生词本还是空的。划词翻译单词即可自动收录。' }}
      </p>
      <div v-for="entry in filtered" :key="entry.id" class="v-item">
        <div class="v-main">
          <div class="v-word">
            {{ entry.word }}
            <button class="icon-btn" title="发音" @click="speak(entry.word, entry.sourceLang)">
              <MIcon name="speaker" :size="14" />
            </button>
          </div>
          <div class="v-def">
            <span v-if="entry.phonetic" class="v-phonetic">{{ entry.phonetic }}</span>
            <span v-if="entry.partOfSpeech" class="v-pos">{{ entry.partOfSpeech }}</span>
            {{ entry.translation }}
          </div>
        </div>
        <div class="v-meta">
          <MChip v-if="entry.streak >= MASTERED_STREAK" variant="primary">
            已掌握
          </MChip>
          <MStars v-else :max="3" :model-value="entry.streak" :size="13" />
          <button class="icon-btn danger" title="删除" @click="remove(entry)">
            <MIcon name="trash" :size="14" />
          </button>
        </div>
      </div>
    </div>

    <footer class="v-foot">
      共 {{ stats.total }} 词 · 已掌握 {{ stats.mastered }} · 练习中 {{ stats.learning }}
    </footer>

    <QuizDialog v-model="quizOpen" :entries="entries" @done="load" />
  </div>
</template>

<style scoped>
.vocab { display: flex; flex-direction: column; height: 100%; min-height: 0; }
.v-toolbar { display: flex; gap: 8px; padding: 10px 12px 0; }
.search { flex: 1; min-width: 0; }
.filter { width: 96px; flex: none; }
.v-actions { display: flex; gap: 6px; padding: 8px 12px; }
.v-actions :deep(.m-btn) { padding: 5px 9px; font-size: 12px; }
.v-list { flex: 1; min-height: 0; overflow-y: auto; padding: 0 12px 8px; display: flex; flex-direction: column; gap: 8px; }
.v-empty { color: var(--m-muted); font-size: 12.5px; line-height: 1.6; }
.v-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  padding: 9px 10px;
}
.v-main { flex: 1; min-width: 0; }
.v-word { display: flex; align-items: center; gap: 4px; font-weight: 650; font-size: 14px; }
.v-def { color: var(--m-muted); font-size: 12.5px; line-height: 1.5; margin-top: 2px; word-break: break-word; }
.v-phonetic { color: var(--m-faint); margin-right: 4px; }
.v-pos { color: var(--m-primary); font-style: italic; margin-right: 4px; }
.v-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.icon-btn {
  border: 0; padding: 4px; border-radius: 7px;
  background: transparent; color: var(--m-muted);
  display: inline-flex; cursor: pointer;
}
.icon-btn:hover { background: var(--m-surface-2); color: var(--m-ink); }
.icon-btn.danger:hover { color: var(--m-blush); }
.v-foot {
  border-top: 1px solid var(--m-line);
  padding: 8px 12px;
  font-size: 11.5px;
  color: var(--m-muted);
}
.hidden-file { display: none; }
</style>

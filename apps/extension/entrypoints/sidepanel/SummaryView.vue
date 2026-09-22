<script setup lang="ts">
import type { ChatStreamHandle } from '@mustard/platform'
import type { ChatMessage, PageContent } from '@mustard/shared'
import { summaryPrompt } from '@mustard/core'
import { getStored, send, setStored, startChat } from '@mustard/platform'
import { langOption, STORAGE_KEYS } from '@mustard/shared'
import { MButton, MIcon, useToast } from '@mustard/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/settings'

const store = useSettingsStore()
const { t } = useI18n()
const { success } = useToast()

type Phase = 'loading' | 'done' | 'error' | 'empty'
const phase = ref<Phase>('loading')
const summary = ref('')
const errorText = ref('')
const content = ref<PageContent | null>(null)
let handle: ChatStreamHandle | null = null

/** 打开侧边栏与写入内容几乎同时发生，这里短暂重试避免读到空 */
async function readPending(): Promise<PageContent | null> {
  for (let i = 0; i < 8; i++) {
    const value = await getStored<PageContent | ''>(STORAGE_KEYS.pendingSummary).catch(() => undefined)
    // 只要拿到了「这一次抽取」的对象就返回；正文为空由调用方按 empty 处理
    if (value && typeof value === 'object' && typeof value.ts === 'number')
      return value
    await new Promise(resolve => setTimeout(resolve, 120))
  }
  return null
}

function stop(): void {
  handle?.abort()
  handle = null
}

async function run(target: PageContent, force = false): Promise<void> {
  if (!store.settings)
    await store.load()
  const settings = store.settings
  const provider = settings?.providers.find(p => p.id === settings.activeProviderId)
  const model = provider?.models.find(m => m.id === settings?.activeModel || m.name === settings?.activeModel)
  if (!settings || !provider?.apiKey || !model) {
    phase.value = 'error'
    errorText.value = t('summary.noAi')
    return
  }

  phase.value = 'loading'
  summary.value = ''
  if (force)
    await setStored(STORAGE_KEYS.pendingSummary, { ...target, summary: undefined })

  const lang = langOption(settings.targetLang)?.label ?? settings.targetLang
  const messages: ChatMessage[] = [
    { id: 's', role: 'system', content: summaryPrompt(lang), createdAt: Date.now() },
    { id: 'u', role: 'user', content: `标题：${target.title}\n\n正文：\n${target.text}`, createdAt: Date.now() },
  ]

  handle = startChat({ messages, providerId: provider.id, model: model.name }, {
    onDelta: (delta) => {
      summary.value += delta
    },
    onDone: (full) => {
      handle = null
      summary.value = full || summary.value
      phase.value = summary.value.trim() ? 'done' : 'error'
      if (!summary.value.trim())
        errorText.value = t('summary.failed')
      else
        void setStored(STORAGE_KEYS.pendingSummary, { ...target, summary: summary.value })
    },
    onError: (code, message) => {
      handle = null
      phase.value = 'error'
      errorText.value = code === 'MISSING_API_KEY' ? t('summary.noAi') : (message || t('summary.failed'))
    },
  })
}

onMounted(async () => {
  const target = await readPending()
  content.value = target
  if (!target || !target.text.trim()) {
    phase.value = 'empty'
    return
  }
  if (target.summary) {
    summary.value = target.summary
    phase.value = 'done'
    return
  }
  await run(target)
})

onBeforeUnmount(stop)

function retry(): void {
  stop()
  if (content.value)
    void run(content.value, true)
}

function openSettings(): void {
  void send({ type: 'OPEN_SIDEBAR', payload: { view: 'settings' } })
}

function copy(): void {
  void navigator.clipboard?.writeText(summary.value)
  success(t('summary.copied'))
}
</script>

<template>
  <div class="summary">
    <p v-if="content?.title" class="src">
      <MIcon name="summary" :size="13" />
      <span class="src-label">{{ t('summary.source') }}</span>
      <span class="src-title">{{ content.title }}</span>
    </p>

    <div v-if="phase === 'loading'" class="state">
      <span class="spin" />
      {{ t('summary.loading') }}
    </div>

    <div v-else-if="phase === 'empty'" class="state">
      {{ t('summary.empty') }}
    </div>

    <template v-else-if="phase === 'error'">
      <p class="state err">
        {{ errorText }}
      </p>
      <div class="acts">
        <MButton variant="ghost" @click="retry">
          {{ t('summary.retry') }}
        </MButton>
        <MButton variant="ghost" @click="openSettings">
          {{ t('nav.settings') }}
        </MButton>
      </div>
    </template>

    <template v-else>
      <div class="body">
        {{ summary }}
      </div>
      <div class="acts">
        <MButton variant="ghost" @click="copy">
          <MIcon name="copy" :size="13" />
          {{ t('summary.copy') }}
        </MButton>
        <MButton variant="ghost" @click="retry">
          <MIcon name="sparkles" :size="13" />
          {{ t('summary.retry') }}
        </MButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-direction: column; gap: 10px; padding: 12px; flex: 1; min-height: 0; overflow-y: auto; }
.src { display: flex; align-items: center; gap: 5px; margin: 0; color: var(--m-muted); font-size: 11.5px; }
.src-label { flex: none; }
.src-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.state { display: flex; align-items: center; gap: 8px; color: var(--m-muted); font-size: 13px; line-height: 1.7; }
.state.err { color: var(--m-blush); margin: 0; }
.spin { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--m-line); border-top-color: var(--m-primary); animation: sp .8s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
.body { white-space: pre-wrap; word-break: break-word; font-size: 13.5px; line-height: 1.75; color: var(--m-ink); }
.acts { display: flex; gap: 8px; }
</style>

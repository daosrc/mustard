<script setup lang="ts">
import type { ChatStreamHandle } from '@mustard/platform'
import type { ChatMessage, PageContent } from '@mustard/shared'
import { summaryPrompt } from '@mustard/core'
import { browser, getStored, send, setStored, startChat } from '@mustard/platform'
import { langOption, STORAGE_KEYS } from '@mustard/shared'
import { MButton, MIcon, useToast } from '@mustard/ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/settings'

const store = useSettingsStore()
const { t } = useI18n()
const { success } = useToast()

type Phase = 'loading' | 'done' | 'error' | 'empty' | 'idle'
const phase = ref<Phase>('loading')
const summary = ref('')
const errorText = ref('')
const content = ref<PageContent | null>(null)
/** 当前标签页是否就是发起总结的那个标签页 */
const inScope = ref(true)
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

/** 当前窗口激活的标签页 id（侧边栏属于某个窗口，取 currentWindow） */
async function activeTabId(): Promise<number | undefined> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    return tab?.id
  }
  catch {
    return undefined
  }
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
      const ok = !!summary.value.trim()
      if (ok)
        void setStored(STORAGE_KEYS.pendingSummary, { ...target, summary: summary.value })
      // 不在发起总结的标签页时只缓存结果，界面仍显示提示
      if (!inScope.value) {
        phase.value = 'idle'
        return
      }
      phase.value = ok ? 'done' : 'error'
      if (!ok)
        errorText.value = t('summary.failed')
    },
    onError: (code, message) => {
      handle = null
      phase.value = 'error'
      errorText.value = code === 'MISSING_API_KEY' ? t('summary.noAi') : (message || t('summary.failed'))
    },
  })
}

/**
 * 总结只在「发起它的标签页」生效：切到别的标签页、或在新标签里打开，
 * 都只显示提示，不展示别的标签页的总结。
 */
async function evaluate(): Promise<void> {
  const target = await readPending()
  // 换了目标（重新点了总结）才中断上一次；切标签页不中断，让请求跑完并写缓存
  if (target?.ts !== content.value?.ts) {
    stop()
    summary.value = ''
  }
  content.value = target
  if (!target || !target.text.trim()) {
    stop()
    inScope.value = true
    phase.value = 'empty'
    return
  }
  const tabId = await activeTabId()
  inScope.value = !(tabId !== undefined && target.tabId !== undefined && target.tabId !== tabId)
  if (!inScope.value) {
    if (target.summary)
      summary.value = target.summary
    phase.value = 'idle'
    return
  }
  if (target.summary) {
    summary.value = target.summary
    phase.value = 'done'
    return
  }
  if (handle) {
    phase.value = 'loading'
    return
  }
  await run(target)
}

function onStorageChanged(changes: Record<string, any>): void {
  if (changes[STORAGE_KEYS.pendingSummary])
    void evaluate()
}

function onTabActivated(): void {
  void evaluate()
}

onMounted(async () => {
  browser.storage.onChanged.addListener(onStorageChanged)
  browser.tabs.onActivated.addListener(onTabActivated)
  await evaluate()
})

onBeforeUnmount(() => {
  browser.storage.onChanged.removeListener(onStorageChanged)
  browser.tabs.onActivated.removeListener(onTabActivated)
  stop()
})

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
    <p v-if="phase !== 'idle' && content?.title" class="src">
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

    <div v-else-if="phase === 'idle'" class="state">
      {{ t('summary.notThisTab') }}
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

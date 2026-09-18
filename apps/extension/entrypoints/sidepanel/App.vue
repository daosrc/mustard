<script setup lang="ts">
import type { Attachment, ChatMessage, Session, Settings } from '@mustard/shared'
import { createSession, sessionTitle } from '@mustard/core/session'
import { getStored, send, setStored, startChat } from '@mustard/platform'
import { LANGS, STORAGE_KEYS } from '@mustard/shared'
import { MChip, MIcon, MSelect, MToastHost, useToast } from '@mustard/ui'
import { uid } from '@mustard/utils'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/useTheme'
import { useSettingsStore } from '../../stores/settings'
import { BALL_ICON } from '../content/ball'
import SettingsPanel from '../options/SettingsPanel.vue'
import HistoryView from './HistoryView.vue'
import VocabView from './VocabView.vue'

useTheme()
const store = useSettingsStore()
const { error } = useToast()
const { t } = useI18n()

const view = ref<'chat' | 'vocab' | 'history' | 'settings'>('chat')

function welcomeMessage(): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    content: t('chat.welcome'),
    status: 'done',
    createdAt: Date.now(),
  }
}

const messages = ref<ChatMessage[]>([welcomeMessage()])
const currentSession = ref<Session | null>(null)
const input = ref('')
const attachments = ref<Attachment[]>([])
const streaming = ref(false)
const bodyEl = ref<HTMLElement>()
const textareaEl = ref<HTMLTextAreaElement>()
const fileEl = ref<HTMLInputElement>()
let handle: { abort: () => void } | null = null

onMounted(async () => {
  await store.load()
  try {
    const pending = await getStored<'chat' | 'vocab' | 'history' | 'settings'>(STORAGE_KEYS.pendingView)
    if (pending === 'vocab' || pending === 'history' || pending === 'settings')
      view.value = pending
    if (pending)
      await setStored(STORAGE_KEYS.pendingView, '')
  }
  catch {
    // 忽略：无待处理视图
  }

  try {
    const compose = await getStored<string>(STORAGE_KEYS.pendingCompose)
    if (compose) {
      input.value = compose
      view.value = 'chat'
      await setStored(STORAGE_KEYS.pendingCompose, '')
    }
  }
  catch {
    // 忽略：无待填入内容
  }
})

/** 过滤掉「已完成但内容为空」的助手消息，避免空白气泡 */
const visibleMessages = computed(() => messages.value.filter(m => m.role !== 'assistant' || m.status !== 'done' || !!m.content.trim()))
const modelOptions = computed(() => (store.settings?.providers ?? []).flatMap(p => p.models.map(m => ({
  label: `${p.name} · ${m.name}`,
  value: `${p.id}::${m.name}`,
}))))
const activeModelValue = computed(() => store.settings ? `${store.settings.activeProviderId}::${store.settings.activeModel}` : undefined)
const langOptions = LANGS.map(l => ({ label: l.short, value: l.code }))

function setTarget(value?: string): void {
  if (value)
    void store.patch({ targetLang: value as Settings['targetLang'] })
}

function openSettings(): void {
  view.value = 'settings'
}

function closePanel(): void {
  window.close()
}

function setActiveModel(value?: string): void {
  if (!value)
    return
  const [providerId, model] = value.split('::')
  if (providerId && model)
    void store.patch({ activeProviderId: providerId, activeModel: model })
}

function scrollToBottom(): void {
  void nextTick(() => {
    if (bodyEl.value)
      bodyEl.value.scrollTop = bodyEl.value.scrollHeight
  })
}

function autoGrow(): void {
  const el = textareaEl.value
  if (!el)
    return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 132)}px`
}

function plainMessages(): ChatMessage[] {
  return messages.value.map(m => ({
    id: m.id,
    role: m.role,
    content: m.content,
    attachments: m.attachments?.map(a => ({ ...a })),
    status: 'done' as const,
    createdAt: m.createdAt,
  }))
}

async function persist(): Promise<void> {
  const base = currentSession.value ?? createSession()
  const session: Session = {
    ...base,
    title: sessionTitle(messages.value),
    messages: plainMessages(),
    updatedAt: Date.now(),
  }
  currentSession.value = await send({ type: 'SAVE_SESSION', payload: { session } })
}

function newChat(): void {
  handle?.abort()
  handle = null
  streaming.value = false
  currentSession.value = null
  messages.value = [welcomeMessage()]
  attachments.value = []
  input.value = ''
  view.value = 'chat'
}

function openSession(session: Session): void {
  handle?.abort()
  handle = null
  streaming.value = false
  currentSession.value = session
  messages.value = session.messages.length ? session.messages.map(m => ({ ...m })) : [welcomeMessage()]
  view.value = 'chat'
  scrollToBottom()
}

async function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

async function addFile(file: File): Promise<void> {
  if (file.type.startsWith('image/')) {
    const dataUrl = await readAsDataURL(file)
    attachments.value.push({ type: 'image', name: file.name || 'screenshot.png', dataUrl, mime: file.type, size: file.size })
  }
  else {
    attachments.value.push({ type: 'file', name: file.name, mime: file.type, size: file.size })
  }
}

function onPickFile(event: Event): void {
  const el = event.target as HTMLInputElement
  if (el.files) {
    for (const file of Array.from(el.files))
      void addFile(file)
  }
  el.value = ''
}

async function translatePastedImage(file: File): Promise<void> {
  const dataUrl = await readAsDataURL(file)
  messages.value.push({
    id: uid('m-'),
    role: 'user',
    content: '',
    attachments: [{ type: 'image', name: 'screenshot.png', dataUrl, mime: file.type }],
    status: 'done',
    createdAt: Date.now(),
  })
  messages.value.push({ id: uid('m-'), role: 'assistant', content: '', status: 'streaming', createdAt: Date.now() })
  const assistant = messages.value[messages.value.length - 1]!
  scrollToBottom()
  try {
    const result = await send({ type: 'TRANSLATE_IMAGE', payload: { dataUrl, targetLang: store.settings?.targetLang ?? 'zh-CN' } })
    assistant.content = result.content
    assistant.status = 'done'
    await persist()
  }
  catch (err) {
    assistant.status = 'error'
    assistant.content = err instanceof Error && err.message === 'MISSING_API_KEY'
      ? t('chat.imageNoKey')
      : t('chat.imageFailed')
  }
}

function onPaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items)
    return
  const imageItem = Array.from(items).find(item => item.type.startsWith('image/'))
  if (!imageItem)
    return
  event.preventDefault()
  if (!store.canAttachActive) {
    error(t('chat.imageUnsupported'))
    return
  }
  const file = imageItem.getAsFile()
  if (file)
    void translatePastedImage(file)
}

function onAttachClick(): void {
  if (!store.canAttachActive) {
    error(t('chat.attachUnsupported'))
    return
  }
  fileEl.value?.click()
}

function onEnter(event: KeyboardEvent): void {
  if (event.isComposing)
    return
  sendMessage()
}

function stop(): void {
  handle?.abort()
  streaming.value = false
  // 收尾：中止时若还没有内容则移除该条，避免留下空白气泡
  const last = messages.value[messages.value.length - 1]
  if (last && last.role === 'assistant' && last.status === 'streaming') {
    if (!last.content.trim())
      messages.value.pop()
    else
      last.status = 'done'
  }
}

function sendMessage(): void {
  const text = input.value.trim()
  if (streaming.value || (!text && !attachments.value.length))
    return
  const settings = store.settings
  if (!settings)
    return

  messages.value.push({ id: uid('m-'), role: 'user', content: text, attachments: attachments.value.length ? attachments.value.map(a => ({ ...a })) : undefined, status: 'done', createdAt: Date.now() })
  input.value = ''
  attachments.value = []
  autoGrow()
  messages.value.push({ id: uid('m-'), role: 'assistant', content: '', status: 'streaming', createdAt: Date.now() })

  const assistant = messages.value[messages.value.length - 1]!
  const history = messages.value
    .filter(m => m.id !== assistant.id)
    .map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt }))

  streaming.value = true
  scrollToBottom()

  handle = startChat(
    { messages: history, providerId: settings.activeProviderId, model: settings.activeModel },
    {
      onDelta: (delta) => {
        assistant.content += delta
        scrollToBottom()
      },
      onDone: (content) => {
        const finalText = (content || assistant.content).trim()
        if (finalText) {
          assistant.content = finalText
          assistant.status = 'done'
        }
        else {
          assistant.status = 'error'
          assistant.content = t('chat.emptyReply')
        }
        streaming.value = false
        handle = null
        void persist()
      },
      onError: (code, message) => {
        assistant.status = 'error'
        assistant.content = code === 'MISSING_API_KEY'
          ? t('chat.noKey')
          : t('chat.requestFailed', { message })
        streaming.value = false
        handle = null
      },
    },
  )
}
</script>

<template>
  <div class="panel">
    <header class="panel-head">
      <template v-if="view === 'chat'">
        <img class="mark" :src="BALL_ICON" alt="Mustard">
      </template>
      <template v-else>
        <button class="icon-btn" :title="t('nav.back')" @click="view = 'chat'">
          <MIcon name="chevron-left" :size="16" />
        </button>
        <span class="name">{{ view === 'vocab' ? t('nav.vocab') : view === 'history' ? t('nav.history') : t('nav.settings') }}</span>
      </template>
      <span class="spacer" />
      <template v-if="view === 'chat'">
        <button class="icon-btn" :title="t('nav.newChat')" @click="newChat">
          <MIcon name="plus" :size="16" />
        </button>
        <button class="icon-btn" :title="t('nav.history')" @click="view = 'history'">
          <MIcon name="history" :size="16" />
        </button>
      </template>
      <button class="icon-btn" :class="{ active: view === 'vocab' }" :title="t('nav.vocab')" @click="view = 'vocab'">
        <MIcon name="book" :size="16" />
      </button>
      <button class="icon-btn" :class="{ active: view === 'settings' }" :title="t('nav.settings')" @click="openSettings">
        <MIcon name="settings" :size="16" />
      </button>
      <button class="icon-btn" :title="t('nav.close')" @click="closePanel">
        <MIcon name="close" :size="16" />
      </button>
    </header>

    <VocabView v-if="view === 'vocab'" />
    <HistoryView v-else-if="view === 'history'" :current-id="currentSession?.id ?? null" @open="openSession" />
    <div v-else-if="view === 'settings'" class="panel-body settings-body">
      <SettingsPanel contained />
    </div>

    <template v-else>
      <main ref="bodyEl" class="panel-body">
        <div v-for="message in visibleMessages" :key="message.id" class="msg" :class="message.role">
          <img v-if="message.role === 'assistant'" class="avatar" :src="BALL_ICON" alt="">
          <div class="bubble" :class="{ error: message.status === 'error' }">
            <template v-if="message.status === 'streaming' && !message.content.trim()">
              <span class="typing">{{ t('chat.thinking') }}</span>
            </template>
            <template v-else>
              <span class="text">{{ message.content }}</span>
              <span v-if="message.status === 'streaming'" class="caret" />
            </template>
            <div v-if="message.attachments?.length" class="msg-atts">
              <img v-for="(att, i) in message.attachments.filter(a => a.type === 'image')" :key="`i-${i}`" class="msg-thumb" :src="att.dataUrl" :alt="att.name">
              <MChip v-for="(att, i) in message.attachments.filter(a => a.type !== 'image')" :key="`f-${i}`">
                <MIcon name="file" :size="12" />
                {{ att.name }}
              </MChip>
            </div>
          </div>
        </div>
      </main>

      <footer class="composer">
        <div class="input-box">
          <div v-if="attachments.length" class="att-strip">
            <MChip v-for="(att, i) in attachments" :key="i" removable @remove="attachments.splice(i, 1)">
              <MIcon :name="att.type === 'image' ? 'image' : 'file'" :size="12" />
              {{ att.name }}
            </MChip>
          </div>
          <textarea
            ref="textareaEl"
            v-model="input"
            rows="1"
            :placeholder="t('chat.placeholder')"
            @input="autoGrow"
            @paste="onPaste"
            @keydown.enter.exact.prevent="onEnter"
          />
          <div class="tools-row">
            <button class="icon-btn" :class="{ disabled: !store.canAttachActive }" :title="store.canAttachActive ? t('chat.attach') : t('chat.attachUnsupported')" @click="onAttachClick">
              <MIcon name="paperclip" :size="16" />
            </button>
            <MSelect
              class="lang-select"
              size="sm"
              variant="chip"
              :model-value="store.settings?.targetLang"
              :options="langOptions"
              @update:model-value="setTarget"
            />
            <MSelect
              class="model-select"
              size="sm"
              :model-value="activeModelValue"
              :options="modelOptions"
              :placeholder="t('chat.modelPlaceholder')"
              @update:model-value="setActiveModel"
            />
            <button v-if="streaming" class="send stop" :title="t('chat.stop')" @click="stop">
              <MIcon name="close" :size="13" :stroke-width="2.4" />
            </button>
            <button v-else class="send" :title="t('chat.send')" :disabled="!input.trim() && !attachments.length" @click="sendMessage">
              <MIcon name="send" :size="13" :stroke-width="2" />
            </button>
          </div>
        </div>
        <input ref="fileEl" class="hidden-file" type="file" accept="image/*,application/pdf,.txt,.md,.doc,.docx" multiple @change="onPickFile">
      </footer>
    </template>

    <MToastHost />
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; height: 100%; background: var(--m-paper); }
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--m-surface);
  z-index: 1;
}
[data-theme='light'] .panel-head {
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--m-primary) 24%, var(--m-paper)) 0%,
    color-mix(in srgb, var(--m-primary) 24%, var(--m-paper)) 55%,
    var(--m-paper) 100%
  );
}
.mark { width: 24px; height: 24px; border-radius: 7px; }
.name { font-weight: 650; font-size: 13.5px; }
.spacer { flex: 1; }
.icon-btn {
  border: 0;
  padding: 5px;
  border-radius: 7px;
  background: transparent;
  color: var(--m-muted);
  display: inline-flex;
  cursor: pointer;
}
.icon-btn:hover:not(.disabled) { background: var(--m-surface-2); color: var(--m-ink); }
.icon-btn.active { color: var(--m-primary); background: var(--m-primary-soft); }
.icon-btn.disabled { opacity: .4; cursor: not-allowed; }
.panel-body { flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 12px; }
.settings-body { position: relative; }
/* 弹窗打开时锁定正文滚动，只允许弹窗内部滚动 */
.settings-body:has(.overlay) { overflow: hidden; }
.msg { display: flex; align-items: flex-start; gap: 8px; }
.msg.user { justify-content: flex-end; }
.avatar { width: 22px; height: 22px; border-radius: 6px; flex: none; margin-top: 2px; }
.bubble {
  background: var(--m-surface-2);
  border-radius: 12px;
  padding: 9px 12px;
  line-height: 1.6;
  max-width: 86%;
  font-size: 13.5px;
  white-space: pre-wrap;
  word-break: break-word;
}
.msg.user .bubble { background: var(--m-primary); color: var(--m-primary-ink); }
.bubble.error { background: color-mix(in srgb, var(--m-blush) 18%, var(--m-surface-2)); color: var(--m-ink); }
.typing { color: var(--m-muted); }
.caret {
  display: inline-block;
  width: 6px;
  height: 14px;
  margin-left: 2px;
  background: currentColor;
  vertical-align: text-bottom;
  animation: blink 1s steps(2, start) infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.msg-atts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.msg-thumb { max-width: 160px; max-height: 120px; border-radius: 8px; display: block; }
.composer {
  padding: 8px;
  background: var(--m-surface);
  z-index: 1;
}
[data-theme='light'] .composer {
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--m-primary) 24%, var(--m-paper)) 0%,
    color-mix(in srgb, var(--m-primary) 24%, var(--m-paper)) 55%,
    var(--m-paper) 100%
  );
}
.input-box { border: 1px solid var(--m-line); border-radius: 12px; padding: 8px 8px 6px; background: var(--m-surface); }
.input-box textarea {
  width: 100%;
  border: 0;
  outline: none;
  resize: none;
  font: inherit;
  font-size: 13.5px;
  background: transparent;
  color: var(--m-ink);
  max-height: 132px;
}
.att-strip { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.tools-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.lang-select { flex: none; }
.model-select { flex: 1; min-width: 0; }
.send {
  width: 24px; height: 24px; border: 0; border-radius: 7px;
  background: var(--m-primary); color: var(--m-primary-ink);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  flex: none;
}
.send.stop { background: var(--m-blush); }
.send:disabled { opacity: .45; cursor: not-allowed; }
.hidden-file { display: none; }
</style>

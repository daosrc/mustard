<script setup lang="ts">
import type { Attachment, ChatMessage } from '@mustard/shared'
import { browser, getStored, send, setStored, startChat } from '@mustard/platform'
import { langShort, STORAGE_KEYS } from '@mustard/shared'
import { MChip, MIcon, MSelect, MToastHost, useToast } from '@mustard/ui'
import { uid } from '@mustard/utils'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { useSettingsStore } from '../../stores/settings'
import { BALL_ICON } from '../content/ball'
import VocabView from './VocabView.vue'

useTheme()
const store = useSettingsStore()
const { error } = useToast()

const view = ref<'chat' | 'vocab'>('chat')

const messages = ref<ChatMessage[]>([
  {
    id: 'welcome',
    role: 'assistant',
    content: '你好，我是 Mustard（芥末）。可以帮你翻译网页、解释单词，或就截图里的内容提问。',
    status: 'done',
    createdAt: Date.now(),
  },
])
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
    const pending = await getStored<'chat' | 'vocab' | 'settings'>(STORAGE_KEYS.pendingView)
    if (pending === 'vocab')
      view.value = 'vocab'
    else if (pending === 'settings')
      void browser.runtime.openOptionsPage()
    if (pending)
      await setStored(STORAGE_KEYS.pendingView, '')
  }
  catch {
    // 忽略：无待处理视图
  }
})

const modelOptions = computed(() => (store.settings?.providers ?? []).flatMap(p => p.models.map(m => ({
  label: `${p.name} · ${m.name}`,
  value: `${p.id}::${m.name}`,
}))))
const activeModelValue = computed(() => store.settings ? `${store.settings.activeProviderId}::${store.settings.activeModel}` : undefined)
const target = computed(() => store.settings ? langShort(store.settings.targetLang) : '中')

function openSettings(): void {
  void browser.runtime.openOptionsPage()
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
  }
  catch (err) {
    assistant.status = 'error'
    assistant.content = err instanceof Error && err.message === 'MISSING_API_KEY'
      ? '尚未配置模型 API Key。请点击右上角设置，配置支持图片输入的模型。'
      : '截图翻译失败，请检查模型与网络。'
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
    error('当前模型不支持图片输入，请切换多模态模型')
    return
  }
  const file = imageItem.getAsFile()
  if (file)
    void translatePastedImage(file)
}

function onAttachClick(): void {
  if (!store.canAttachActive) {
    error('当前模型不支持附件，请切换支持图片/附件的模型')
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
}

function sendMessage(): void {
  const text = input.value.trim()
  if (streaming.value || (!text && !attachments.value.length))
    return
  const settings = store.settings
  if (!settings)
    return

  messages.value.push({ id: uid('m-'), role: 'user', content: text, attachments: attachments.value.length ? structuredClone(attachments.value) : undefined, status: 'done', createdAt: Date.now() })
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
        if (content)
          assistant.content = content
        assistant.status = 'done'
        streaming.value = false
        handle = null
      },
      onError: (code, message) => {
        assistant.status = 'error'
        assistant.content = code === 'MISSING_API_KEY'
          ? '尚未配置模型 API Key。请点击右上角设置，配置 OpenCode Zen 或自定义提供商。'
          : `请求失败：${message}`
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
      <button v-if="view !== 'chat'" class="icon-btn" title="返回" @click="view = 'chat'">
        <MIcon name="chevron-left" :size="16" />
      </button>
      <img v-else class="mark" :src="BALL_ICON" alt="Mustard">
      <span class="name">{{ view === 'vocab' ? '生词本' : 'Mustard · 芥末' }}</span>
      <span class="spacer" />
      <button class="icon-btn" :class="{ active: view === 'chat' }" title="对话" @click="view = 'chat'">
        <MIcon name="message" :size="16" />
      </button>
      <button class="icon-btn" :class="{ active: view === 'vocab' }" title="生词本" @click="view = 'vocab'">
        <MIcon name="book" :size="16" />
      </button>
      <button class="icon-btn" title="设置" @click="openSettings">
        <MIcon name="settings" :size="16" />
      </button>
    </header>

    <VocabView v-if="view === 'vocab'" />

    <template v-else>
      <main ref="bodyEl" class="panel-body">
        <div v-for="message in messages" :key="message.id" class="msg" :class="message.role">
          <img v-if="message.role === 'assistant'" class="avatar" :src="BALL_ICON" alt="">
          <div class="bubble" :class="{ error: message.status === 'error' }">
            <template v-if="message.status === 'streaming' && !message.content">
              <span class="typing">思考中…</span>
            </template>
            <template v-else>
              <span class="text">{{ message.content }}</span>
              <span v-if="message.status === 'streaming'" class="caret" />
            </template>
            <div v-if="message.attachments?.length" class="msg-atts">
              <MChip v-for="(att, i) in message.attachments" :key="i">
                <MIcon :name="att.type === 'image' ? 'image' : 'file'" :size="12" />
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
            placeholder="输入消息，Enter 发送 / Shift+Enter 换行"
            @input="autoGrow"
            @paste="onPaste"
            @keydown.enter.exact.prevent="onEnter"
          />
          <div class="tools-row">
            <button class="icon-btn" :class="{ disabled: !store.canAttachActive }" :title="store.canAttachActive ? '上传附件' : '当前模型不支持附件'" @click="onAttachClick">
              <MIcon name="paperclip" :size="16" />
            </button>
            <MChip variant="primary">
              {{ target }}
            </MChip>
            <MSelect
              class="model-select"
              size="sm"
              :model-value="activeModelValue"
              :options="modelOptions"
              placeholder="选择模型"
              @update:model-value="setActiveModel"
            />
            <span class="spacer" />
            <button v-if="streaming" class="send stop" title="停止" @click="stop">
              <MIcon name="close" :size="13" :stroke-width="2.4" />
            </button>
            <button v-else class="send" title="发送" :disabled="!input.trim() && !attachments.length" @click="sendMessage">
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
  border-bottom: 1px solid var(--m-line);
  background: var(--m-surface);
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
.composer { border-top: 1px solid var(--m-line); padding: 8px; background: var(--m-surface); }
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
.model-select { flex: 1; min-width: 0; max-width: 55%; }
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

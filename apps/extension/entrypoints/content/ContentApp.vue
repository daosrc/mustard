<script setup lang="ts">
import type { Settings, ToolItem } from '@mustard/shared'
import { browser, send } from '@mustard/platform'
import { STORAGE_KEYS, t as translate } from '@mustard/shared'
import { MIcon } from '@mustard/ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from './ball'
import HoverTooltip from './HoverTooltip.vue'
import PageToolbar from './PageToolbar.vue'
import { pageState, setPageSettings, startPageTranslate, stopPageTranslate } from './pageTranslator'
import SelectionLayer from './SelectionLayer.vue'

const TOOL_ICON: Record<string, string> = {
  pageTranslate: 'globe',
  hoverTranslate: 'message',
  selectionTranslate: 'translate',
  vocab: 'book',
  settings: 'settings',
}

const FEATURE_BY_TOOL: Record<string, keyof Settings['features']> = {
  pageTranslate: 'pageTranslate',
  hoverTranslate: 'hoverTranslate',
  selectionTranslate: 'selectionTranslate',
}

const RADIUS = 100
const STEP_DEG = 26

const rootEl = ref<HTMLElement>()
const settings = ref<Settings | null>(null)
const open = ref(false)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function onPointerEnter(): void {
  clearTimeout(closeTimer)
  open.value = true
}

function onPointerLeave(): void {
  // 宽限期：从球移向工具（两者间有空隙）时不闪退
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    open.value = false
  }, 380)
}

onMounted(() => {
  void refresh()
  browser.storage.onChanged.addListener(onStorage)
})
onBeforeUnmount(() => {
  browser.storage.onChanged.removeListener(onStorage)
  clearTimeout(closeTimer)
})

function onStorage(changes: Record<string, unknown>): void {
  if (changes[STORAGE_KEYS.settings] || changes[STORAGE_KEYS.vocab])
    void refresh()
}

async function refresh(): Promise<void> {
  try {
    settings.value = await send({ type: 'GET_SETTINGS' })
  }
  catch {
    settings.value = null
  }
}

function onAdded(): void {
  void refresh()
}

function tr(key: string): string {
  return translate(settings.value?.uiLang ?? 'zh', key)
}

function toolLabel(tool: ToolItem): string {
  const key = `content.tool.${tool.id}`
  const value = translate(settings.value?.uiLang ?? 'zh', key)
  return value === key ? tool.label : value
}

const ball = computed(() => settings.value?.floatingBall ?? null)
const enabled = computed(() => ball.value?.enabled !== false)
const isStack = computed(() => ball.value?.expand === 'stack')
const tools = computed(() =>
  [...(ball.value?.tools ?? [])]
    .filter(tool => tool.visible)
    .sort((a, b) => a.order - b.order),
)

useTheme(() => (enabled.value ? rootEl.value : undefined))

watch(settings, (value) => {
  setPageSettings(value)
  // 之前因未接入 AI 模型没开始翻译：配置好后自动开始
  if (value?.features.pageTranslate && !pageState.active)
    startPageTranslate(value)
})
watch(() => settings.value?.features.pageTranslate, (on) => {
  if (on)
    startPageTranslate(settings.value)
  else
    stopPageTranslate()
})

function restorePage(): void {
  stopPageTranslate()
  if (settings.value) {
    void send({
      type: 'UPDATE_SETTINGS',
      payload: { features: { ...settings.value.features, pageTranslate: false } },
    })
  }
}

function toolStyle(index: number): Record<string, string | number> {
  const angle = (180 - index * STEP_DEG) * Math.PI / 180
  const mirror = ball.value?.position === 'left' ? -1 : 1
  return {
    '--x': `${Math.round(RADIUS * Math.cos(angle)) * mirror}px`,
    '--y': `${-Math.round(RADIUS * Math.sin(angle))}px`,
    '--i': index,
  }
}

function isOn(id: string): boolean {
  const key = FEATURE_BY_TOOL[id]
  return key ? !!settings.value?.features[key] : false
}

async function onToolClick(tool: ToolItem): Promise<void> {
  if (tool.type === 'toggle') {
    const key = FEATURE_BY_TOOL[tool.id]
    if (!key || !settings.value)
      return
    settings.value = await send({
      type: 'UPDATE_SETTINGS',
      payload: { features: { ...settings.value.features, [key]: !settings.value.features[key] } },
    })
    return
  }
  void send({ type: 'OPEN_SIDEBAR', payload: { view: tool.id === 'vocab' ? 'vocab' : 'settings' } })
}

function onBallClick(): void {
  void send({ type: 'OPEN_SIDEBAR', payload: { view: 'chat' } })
}
</script>

<template>
  <div v-if="enabled" ref="rootEl" class="mustard-wrap" :class="ball?.position === 'left' ? 'left' : 'right'">
    <div class="fab-root" :class="{ open, stack: isStack }" @pointerenter="onPointerEnter" @pointerleave="onPointerLeave">
      <div class="tools">
        <button
          v-for="(tool, index) in tools"
          :key="tool.id"
          class="tool"
          :class="{ on: isOn(tool.id) }"
          :style="toolStyle(index)"
          :title="toolLabel(tool)"
          @click.stop="onToolClick(tool)"
        >
          <MIcon :name="TOOL_ICON[tool.id] ?? 'sparkles'" :size="20" />
          <span class="tool-label">{{ toolLabel(tool) }}</span>
        </button>
      </div>
      <button class="fab" :title="tr('app.name')" @click="onBallClick">
        <img class="fab-logo" :src="BALL_ICON" alt="Mustard">
      </button>
    </div>

    <SelectionLayer :settings="settings" @added="onAdded" />
    <HoverTooltip :settings="settings" @added="onAdded" />
    <PageToolbar :ui-lang="settings?.uiLang ?? 'zh'" @restore="restorePage" />
  </div>
</template>

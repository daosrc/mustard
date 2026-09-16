<script setup lang="ts">
import type { Settings, ToolItem } from '@mustard/shared'
import { send } from '@mustard/platform'
import { MIcon } from '@mustard/ui'
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from './ball'

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

onMounted(async () => {
  try {
    settings.value = await send({ type: 'GET_SETTINGS' })
  }
  catch {
    settings.value = null
  }
})

const ball = computed(() => settings.value?.floatingBall ?? null)
const enabled = computed(() => ball.value?.enabled !== false)
const isStack = computed(() => ball.value?.expand === 'stack')
const tools = computed(() =>
  [...(ball.value?.tools ?? [])]
    .filter(tool => tool.visible)
    .sort((a, b) => a.order - b.order),
)

useTheme(() => (enabled.value ? rootEl.value : undefined))

function toolStyle(index: number): Record<string, string | number> {
  const angle = (180 - index * STEP_DEG) * Math.PI / 180
  return {
    '--x': `${Math.round(RADIUS * Math.cos(angle))}px`,
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
    <div class="fab-root" :class="{ open, stack: isStack }" @pointerenter="open = true" @pointerleave="open = false">
      <div class="tools">
        <button
          v-for="(tool, index) in tools"
          :key="tool.id"
          class="tool"
          :class="{ on: isOn(tool.id) }"
          :style="toolStyle(index)"
          :title="tool.label"
          @click.stop="onToolClick(tool)"
        >
          <MIcon :name="TOOL_ICON[tool.id] ?? 'sparkles'" :size="20" />
          <span class="tool-label">{{ tool.label }}</span>
        </button>
      </div>
      <button class="fab" title="Mustard 芥末" @click="onBallClick">
        <img class="fab-logo" :src="BALL_ICON" alt="Mustard">
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { send } from '@mustard/platform'
import { MIcon } from '@mustard/ui'
import { ref } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from './ball'

interface ToolDef {
  id: string
  label: string
  type: 'toggle' | 'action'
  x: string
  y: string
  i: number
  icon: string
}

const TOOLS: ToolDef[] = [
  { id: 'pageTranslate', label: '网页翻译', type: 'toggle', x: '-100px', y: '0px', i: 0, icon: 'globe' },
  { id: 'hoverTranslate', label: '悬浮翻译', type: 'toggle', x: '-90px', y: '-44px', i: 1, icon: 'message' },
  { id: 'selectionTranslate', label: '划词翻译', type: 'toggle', x: '-61px', y: '-79px', i: 2, icon: 'translate' },
  { id: 'vocab', label: '生词本', type: 'action', x: '-20px', y: '-98px', i: 3, icon: 'book' },
  { id: 'settings', label: '设置', type: 'action', x: '26px', y: '-97px', i: 4, icon: 'settings' },
]

const rootEl = ref<HTMLElement>()
useTheme(() => rootEl.value)

const open = ref(false)
const toggles = ref<Record<string, boolean>>({
  pageTranslate: false,
  hoverTranslate: false,
  selectionTranslate: true,
})

function onBallClick() {
  void send({ type: 'OPEN_SIDEBAR', payload: { view: 'chat' } })
}

function onToolClick(tool: ToolDef) {
  if (tool.type === 'toggle') {
    toggles.value[tool.id] = !toggles.value[tool.id]
    return
  }
  void send({ type: 'OPEN_SIDEBAR', payload: { view: tool.id === 'vocab' ? 'vocab' : 'settings' } })
}
</script>

<template>
  <div ref="rootEl" class="mustard-wrap">
    <div class="fab-root" :class="{ open }" @pointerenter="open = true" @pointerleave="open = false">
      <div class="tools">
        <button
          v-for="tool in TOOLS"
          :key="tool.id"
          class="tool"
          :class="{ on: toggles[tool.id] }"
          :style="{ '--x': tool.x, '--y': tool.y, '--i': tool.i }"
          :title="tool.label"
          @click.stop="onToolClick(tool)"
        >
          <MIcon :name="tool.icon" :size="20" />
          <span class="tool-label">{{ tool.label }}</span>
        </button>
      </div>
      <button class="fab" title="Mustard 芥末" @click="onBallClick">
        <img class="fab-logo" :src="BALL_ICON" alt="Mustard">
      </button>
    </div>
  </div>
</template>

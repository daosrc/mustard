<script setup lang="ts">
import { send } from '@mustard/platform'
import { ref } from 'vue'
import { BALL_ICON } from './ball'

interface ToolDef {
  id: string
  label: string
  type: 'toggle' | 'action'
  x: string
  y: string
  i: number
  paths: string[]
}

const TOOLS: ToolDef[] = [
  { id: 'pageTranslate', label: '网页翻译', type: 'toggle', x: '-100px', y: '0px', i: 0, paths: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M3 12h18', 'M12 3a15 15 0 0 1 0 18', 'M12 3a15 15 0 0 0 0 18'] },
  { id: 'hoverTranslate', label: '悬浮翻译', type: 'toggle', x: '-90px', y: '-44px', i: 1, paths: ['M4 4h16v12H7l-3 4V4Z', 'M9 9h6', 'M9 12h4'] },
  { id: 'selectionTranslate', label: '划词翻译', type: 'toggle', x: '-61px', y: '-79px', i: 2, paths: ['M3.6 5.6h7.2', 'M7.2 3.3v2.3', 'M3.5 8.7 10.9 14', 'M10.9 8.7 3.5 14', 'M13.6 19.6 17.5 10.4 21.4 19.6', 'M14.9 16.4h5.2'] },
  { id: 'vocab', label: '生词本', type: 'action', x: '-20px', y: '-98px', i: 3, paths: ['M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2V5Z', 'M8 3v18'] },
  { id: 'settings', label: '设置', type: 'action', x: '26px', y: '-97px', i: 4, paths: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'] },
]

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
  <div class="mustard-wrap">
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path v-for="(d, idx) in tool.paths" :key="idx" :d="d" />
          </svg>
          <span class="tool-label">{{ tool.label }}</span>
        </button>
      </div>
      <button class="fab" title="Mustard 芥末" @click="onBallClick">
        <img class="fab-logo" :src="BALL_ICON" alt="Mustard">
      </button>
    </div>
  </div>
</template>

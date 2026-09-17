<script setup lang="ts">
import type { SelectOption } from '../types'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MIcon from './MIcon.vue'

const props = withDefaults(defineProps<{
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'default' | 'chip'
}>(), {
  placeholder: '请选择',
  disabled: false,
  size: 'md',
  variant: 'default',
})

const model = defineModel<string>()
const open = ref(false)
const dropUp = ref(false)
const root = ref<HTMLElement>()

const current = computed(() => props.options.find(o => o.value === model.value))

function measureDirection(): void {
  const el = root.value
  if (!el)
    return
  const rect = el.getBoundingClientRect()
  // 下方空间不足则向上弹（侧边栏底部输入区常见）
  dropUp.value = window.innerHeight - rect.bottom < 260
}

function toggle() {
  if (props.disabled)
    return
  open.value = !open.value
  if (open.value)
    void nextTick(measureDirection)
}

function select(option: SelectOption) {
  if (option.disabled)
    return
  model.value = option.value
  open.value = false
}

function onDocClick(event: MouseEvent) {
  // 用 composedPath 兼容 Shadow DOM（content script）
  if (root.value && !event.composedPath().includes(root.value))
    open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape')
    open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="m-select" :class="[`is-${size}`, `is-${variant}`, { open, disabled, 'drop-up': dropUp }]">
    <button class="trigger" type="button" :disabled="disabled" @click="toggle">
      <span class="value" :class="{ placeholder: !current }">{{ current?.label ?? placeholder }}</span>
      <MIcon name="chevron-down" :size="14" class="caret" />
    </button>
    <ul v-if="open" class="menu" role="listbox">
      <li
        v-for="option in options"
        :key="option.value"
        class="option"
        :class="{ active: option.value === model, disabled: option.disabled }"
        role="option"
        :aria-selected="option.value === model"
        @click="select(option)"
      >
        <span class="opt-label">{{ option.label }}</span>
        <MIcon v-if="option.value === model" name="check" :size="14" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.m-select {
  position: relative;
  min-width: 0;
}
.trigger {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px solid var(--m-line);
  border-radius: 10px;
  background: var(--m-surface);
  color: var(--m-ink);
  font: inherit;
  font-size: 13px;
  padding: 7px 10px;
  cursor: pointer;
  transition: border-color .15s;
}
.m-select.is-sm .trigger { padding: 4px 8px; font-size: 12px; border-radius: 8px; }
/* chip 变体：无边框、药丸样式（用于目标语言） */
.m-select.is-chip .trigger {
  width: auto;
  border-color: transparent;
  background: var(--m-primary-soft);
  color: var(--m-primary);
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  gap: 2px;
}
.m-select.is-chip .caret { width: 12px; height: 12px; }
.m-select.is-chip .menu { left: 0; right: auto; }
.trigger:hover { border-color: var(--m-primary); }
.m-select.open .trigger { border-color: var(--m-primary); }
.m-select.disabled .trigger { opacity: .5; cursor: not-allowed; }
.value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.value.placeholder { color: var(--m-faint); }
.caret { color: var(--m-muted); transition: transform .15s; }
.m-select.open .caret { transform: rotate(180deg); }
.menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: auto;
  right: 0;
  min-width: 200px;
  max-width: min(320px, 82vw);
  margin: 0;
  padding: 4px;
  list-style: none;
  max-height: 240px;
  overflow-y: auto;
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  box-shadow: var(--m-shadow-md);
}
.option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  font-size: 13px;
  color: var(--m-ink);
  cursor: pointer;
}
.m-select.drop-up .menu { top: auto; bottom: calc(100% + 4px); }
.option:hover { background: var(--m-surface-2); }
.option.active { color: var(--m-primary); font-weight: 600; }
.opt-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.option.disabled { opacity: .45; cursor: not-allowed; }
</style>

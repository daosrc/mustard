<script setup lang="ts">
import type { TabItem } from '../types'
import MIcon from './MIcon.vue'

withDefaults(defineProps<{
  tabs: TabItem[]
  variant?: 'line' | 'pill'
}>(), {
  variant: 'line',
})

const model = defineModel<string>()
</script>

<template>
  <div class="m-tabs" :class="`is-${variant}`" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ active: tab.key === model }"
      type="button"
      role="tab"
      :disabled="tab.disabled"
      :aria-selected="tab.key === model"
      @click="model = tab.key"
    >
      <MIcon v-if="tab.icon" :name="tab.icon" :size="15" />
      <span>{{ tab.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.m-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--m-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 10px;
  cursor: pointer;
  transition: .15s;
}
.tab:disabled { opacity: .45; cursor: not-allowed; }
.is-line { border-bottom: 1px solid var(--m-line); }
.is-line .tab { border-bottom: 2px solid transparent; margin-bottom: -1px; }
.is-line .tab:hover { color: var(--m-ink); }
.is-line .tab.active { color: var(--m-primary); border-bottom-color: var(--m-primary); }
.is-pill { gap: 4px; background: var(--m-surface-2); border-radius: 10px; padding: 3px; }
.is-pill .tab { border-radius: 8px; padding: 6px 12px; }
.is-pill .tab.active { background: var(--m-surface); color: var(--m-primary); box-shadow: var(--m-shadow-sm); }
</style>

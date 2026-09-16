<script setup lang="ts">
import { MIcon } from '@mustard/ui'
import { pageState } from './pageTranslator'

defineEmits<{ restore: [] }>()
</script>

<template>
  <div v-if="pageState.active" class="page-bar">
    <span v-if="pageState.total > 0 && pageState.done >= pageState.total" class="pb-dot done" />
    <span v-else class="pb-dot" />
    <span class="pb-text">
      <template v-if="!pageState.total">正在扫描页面…</template>
      <template v-else-if="pageState.done < pageState.total">翻译中 {{ pageState.done }}/{{ pageState.total }}</template>
      <template v-else-if="pageState.ok">翻译完成 · {{ pageState.ok }} 段</template>
      <template v-else>未翻译任何内容（请配置模型 API Key）</template>
    </span>
    <button class="pb-btn" @click="$emit('restore')">
      <MIcon name="close" :size="13" />
      还原原文
    </button>
  </div>
</template>

<style scoped>
.page-bar {
  position: fixed;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px 7px 12px;
  border-radius: 999px;
  background: var(--m-surface);
  color: var(--m-ink);
  border: 1px solid var(--m-line);
  box-shadow: var(--m-shadow-md);
  font-size: 12.5px;
  white-space: nowrap;
}
.pb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--m-primary);
  animation: pb-pulse 1s ease-in-out infinite;
}
.pb-dot.done { animation: none; background: var(--m-accent); }
@keyframes pb-pulse { 50% { opacity: .35; } }
.pb-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--m-surface-2);
  color: var(--m-ink);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.pb-btn:hover { background: var(--m-primary-soft); color: var(--m-primary); }
</style>

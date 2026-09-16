<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'ghost'
  disabled?: boolean
}>(), {
  variant: 'primary',
  disabled: false,
})
</script>

<template>
  <button class="m-btn" :class="[`is-${variant}`]" :disabled="disabled">
    <slot />
  </button>
</template>

<style scoped>
.m-btn {
  border: 0;
  border-radius: 9px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: .15s;
}
.is-primary { background: var(--m-primary); color: var(--m-primary-ink); }
.is-ghost { background: var(--m-surface-2); color: var(--m-ink); }
.m-btn:disabled { opacity: .45; cursor: not-allowed; }
</style>

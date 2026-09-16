<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'primary' | 'blush'
  removable?: boolean
}>(), {
  variant: 'default',
  removable: false,
})

defineEmits<{ remove: [] }>()
</script>

<template>
  <span class="m-chip" :class="`is-${variant}`">
    <slot />
    <button v-if="removable" class="x" type="button" title="移除" @click="$emit('remove')">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  </span>
</template>

<style scoped>
.m-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1;
  color: var(--m-muted);
  background: var(--m-surface-2);
  border: 1px solid var(--m-line);
  padding: 3px 8px;
  border-radius: 8px;
  max-width: 100%;
}
.m-chip.is-primary {
  color: var(--m-primary);
  background: var(--m-primary-soft);
  border-color: transparent;
}
.m-chip.is-blush {
  color: var(--m-blush);
  background: color-mix(in srgb, var(--m-blush) 16%, transparent);
  border-color: transparent;
}
.x {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  cursor: pointer;
  opacity: .7;
}
.x:hover { opacity: 1; }
</style>

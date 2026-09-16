<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  hint?: string
  inline?: boolean
}>(), {
  inline: false,
})
</script>

<template>
  <label class="m-field" :class="{ inline }">
    <span v-if="label" class="label">
      {{ label }}
      <span v-if="hint" class="hint">{{ hint }}</span>
    </span>
    <span class="control">
      <slot />
    </span>
  </label>
</template>

<style scoped>
.m-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.m-field.inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.label {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--m-ink);
}
.hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--m-muted);
}
.control {
  min-width: 0;
}
.m-field.inline .control {
  flex: none;
}
</style>

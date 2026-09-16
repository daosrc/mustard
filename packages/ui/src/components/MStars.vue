<script setup lang="ts">
withDefaults(defineProps<{
  max?: number
  readonly?: boolean
  size?: number
}>(), {
  max: 5,
  readonly: true,
  size: 16,
})

const model = defineModel<number>({ default: 0 })

function pick(index: number) {
  model.value = index
}
</script>

<template>
  <span class="m-stars" role="img" :aria-label="`${model} / ${max}`">
    <button
      v-for="i in max"
      :key="i"
      class="star"
      :class="{ on: i <= model }"
      type="button"
      :disabled="readonly"
      :style="{ width: `${size}px`, height: `${size}px` }"
      @click="pick(i)"
    >
      <svg
        viewBox="0 0 24 24"
        :fill="i <= model ? 'currentColor' : 'none'"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      >
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
      </svg>
    </button>
  </span>
</template>

<style scoped>
.m-stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--m-faint);
}
.star {
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  display: inline-flex;
  cursor: default;
}
.star:not(:disabled) { cursor: pointer; }
.star.on { color: var(--m-warn); }
.star svg { width: 100%; height: 100%; display: block; }
</style>

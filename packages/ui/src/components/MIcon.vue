<script setup lang="ts">
import { computed } from 'vue'
import { ICONS } from '../icons'

const props = withDefaults(defineProps<{
  name: string
  size?: number | string
  strokeWidth?: number
}>(), {
  size: 18,
  strokeWidth: 1.9,
})

const shapes = computed(() => ICONS[props.name] ?? [])
</script>

<template>
  <svg
    class="m-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(s, i) in shapes" :key="i">
      <path v-if="s.t === 'path'" :d="s.d" />
      <circle v-else-if="s.t === 'circle'" :cx="s.cx" :cy="s.cy" :r="s.r" />
      <rect v-else-if="s.t === 'rect'" :x="s.x" :y="s.y" :width="s.w" :height="s.h" :rx="s.rx" />
      <line v-else :x1="s.x1" :y1="s.y1" :x2="s.x2" :y2="s.y2" />
    </template>
  </svg>
</template>

<style scoped>
.m-icon {
  display: block;
  flex: none;
}
</style>

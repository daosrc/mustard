<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  count?: number
  dot?: boolean
  max?: number
  variant?: 'primary' | 'blush' | 'warn'
}>(), {
  max: 99,
  variant: 'blush',
})

const text = computed(() => {
  if (props.count === undefined)
    return ''
  return props.count > props.max ? `${props.max}+` : String(props.count)
})

const show = computed(() => props.dot || (props.count !== undefined && props.count > 0))
</script>

<template>
  <span v-if="show" class="m-badge" :class="[`is-${variant}`, { dot }]">
    <template v-if="!dot">{{ text }}</template>
  </span>
</template>

<style scoped>
.m-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}
.m-badge.dot {
  min-width: 8px;
  width: 8px;
  height: 8px;
  padding: 0;
}
.is-primary { background: var(--m-primary); color: var(--m-primary-ink); }
.is-blush { background: var(--m-blush); }
.is-warn { background: var(--m-warn); }
</style>

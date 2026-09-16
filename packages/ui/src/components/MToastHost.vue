<script setup lang="ts">
import { useToast } from '../toast'
import MIcon from './MIcon.vue'

const { toasts, dismiss } = useToast()

const ICON: Record<string, string> = {
  info: 'info',
  success: 'check',
  error: 'warning',
}
</script>

<template>
  <div class="m-toasts" role="status" aria-live="polite">
    <TransitionGroup name="m-toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="m-toast"
        :class="`is-${toast.kind}`"
        @click="dismiss(toast.id)"
      >
        <MIcon :name="ICON[toast.kind] ?? 'info'" :size="15" />
        <span class="msg">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.m-toasts {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.m-toast {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 420px;
  padding: 9px 14px;
  border-radius: 10px;
  font-size: 13px;
  color: var(--m-ink);
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  box-shadow: var(--m-shadow-md);
  cursor: pointer;
  pointer-events: auto;
}
.m-toast.is-success { color: var(--m-primary); border-color: var(--m-primary-soft); }
.m-toast.is-error { color: var(--m-blush); border-color: color-mix(in srgb, var(--m-blush) 40%, transparent); }
.msg { color: var(--m-ink); }

.m-toast-enter-active,
.m-toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.m-toast-enter-from,
.m-toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>

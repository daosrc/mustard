<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import MIcon from './MIcon.vue'

withDefaults(defineProps<{
  title?: string
  width?: string
  closeOnOverlay?: boolean
}>(), {
  width: '420px',
  closeOnOverlay: true,
})

const open = defineModel<boolean>({ default: false })

function close() {
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value)
    close()
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="m-dialog">
    <div v-if="open" class="overlay" @click.self="closeOnOverlay && close()">
      <div class="panel" role="dialog" aria-modal="true" :style="{ width }">
        <header class="head">
          <span class="title"><slot name="title">{{ title }}</slot></span>
          <button class="x" type="button" title="关闭" @click="close">
            <MIcon name="close" :size="16" />
          </button>
        </header>
        <div class="body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="foot">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(20, 30, 14, .42);
}
.panel {
  max-width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--m-surface);
  color: var(--m-ink);
  border: 1px solid var(--m-line);
  border-radius: 16px;
  box-shadow: var(--m-shadow-lg);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--m-line);
}
.title { font-size: 14px; font-weight: 650; }
.x {
  border: 0;
  padding: 4px;
  border-radius: 7px;
  background: transparent;
  color: var(--m-muted);
  cursor: pointer;
  display: inline-flex;
}
.x:hover { background: var(--m-surface-2); color: var(--m-ink); }
.body { padding: 16px; overflow-y: auto; font-size: 13px; line-height: 1.6; }
.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--m-line);
}

.m-dialog-enter-active,
.m-dialog-leave-active { transition: opacity .18s ease; }
.m-dialog-enter-active .panel,
.m-dialog-leave-active .panel { transition: transform .18s cubic-bezier(.34, 1.4, .64, 1), opacity .18s ease; }
.m-dialog-enter-from,
.m-dialog-leave-to { opacity: 0; }
.m-dialog-enter-from .panel,
.m-dialog-leave-to .panel { transform: translateY(8px) scale(.97); opacity: 0; }
</style>

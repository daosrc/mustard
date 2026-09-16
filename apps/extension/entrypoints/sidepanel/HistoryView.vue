<script setup lang="ts">
import type { Session } from '@mustard/shared'
import { send } from '@mustard/platform'
import { MIcon } from '@mustard/ui'
import { timeAgo } from '@mustard/utils'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{ currentId: string | null }>()
const emit = defineEmits<{ open: [Session], changed: [] }>()

const sessions = ref<Session[]>([])

async function load(): Promise<void> {
  sessions.value = await send({ type: 'GET_SESSIONS' })
}

onMounted(load)

const ordered = computed(() => [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt))

async function remove(session: Session, event: Event): Promise<void> {
  event.stopPropagation()
  await send({ type: 'DELETE_SESSION', payload: { id: session.id } })
  await load()
  emit('changed')
}
</script>

<template>
  <div class="history">
    <p v-if="!ordered.length" class="h-empty">
      还没有历史会话。发送第一条消息后会自动保存。
    </p>
    <div
      v-for="session in ordered"
      :key="session.id"
      class="h-item"
      :class="{ current: session.id === props.currentId }"
      @click="emit('open', session)"
    >
      <div class="h-main">
        <div class="h-title">
          {{ session.title }}
        </div>
        <div class="h-meta">
          {{ timeAgo(session.updatedAt) }} · {{ session.id === props.currentId ? '当前会话' : '点击查看' }}
        </div>
      </div>
      <button class="icon-btn danger" title="删除" @click="remove(session, $event)">
        <MIcon name="trash" :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.history { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.h-empty { color: var(--m-muted); font-size: 12.5px; line-height: 1.6; }
.h-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  padding: 9px 10px;
  cursor: pointer;
  transition: border-color .15s;
}
.h-item:hover { border-color: var(--m-primary); }
.h-item.current { border-color: var(--m-primary); background: var(--m-primary-soft); }
.h-main { flex: 1; min-width: 0; }
.h-title { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.h-meta { font-size: 11.5px; color: var(--m-muted); margin-top: 2px; }
.icon-btn {
  border: 0; padding: 4px; border-radius: 7px;
  background: transparent; color: var(--m-muted);
  display: inline-flex; cursor: pointer;
}
.icon-btn:hover { background: var(--m-surface-2); color: var(--m-ink); }
.icon-btn.danger:hover { color: var(--m-blush); }
</style>

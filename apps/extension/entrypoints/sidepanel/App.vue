<script setup lang="ts">
import type { Settings } from '@mustard/shared'
import { send } from '@mustard/platform'
import { langShort } from '@mustard/shared'
import { computed, onMounted, ref } from 'vue'
import { BALL_ICON } from '../content/ball'

const settings = ref<Settings | null>(null)

onMounted(async () => {
  try {
    settings.value = await send({ type: 'GET_SETTINGS' })
  }
  catch {
    settings.value = null
  }
})

const target = computed(() => settings.value ? langShort(settings.value.targetLang) : '中')
const model = computed(() => settings.value?.activeModel ?? '未配置模型')
const aiConfigured = computed(() => !!settings.value?.providers.find(p => p.id === settings.value?.activeProviderId)?.apiKey)
</script>

<template>
  <div class="panel">
    <header class="panel-head">
      <img class="mark" :src="BALL_ICON" alt="Mustard">
      <span class="name">Mustard · 芥末</span>
      <span class="spacer" />
      <span class="chip">{{ model }}</span>
    </header>

    <main class="panel-body">
      <div class="msg ai">
        <div class="bubble">
          你好，我是 Mustard（芥末）。可以帮你翻译网页、解释单词，或就截图里的内容提问。
        </div>
      </div>

      <div v-if="!aiConfigured" class="notice">
        尚未配置模型 API Key，AI 功能暂不可用。请到<b>设置</b>页配置 OpenCode Zen 或自定义提供商。
      </div>
    </main>

    <footer class="composer">
      <div class="input-box">
        <textarea rows="1" placeholder="输入消息…（M4/M7 实现对话与附件）" />
        <div class="tools-row">
          <span class="chip">{{ target }}</span>
          <span class="spacer" />
          <button class="send" title="发送" disabled>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--m-paper);
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--m-line);
  background: var(--m-surface);
}
.mark { width: 24px; height: 24px; border-radius: 7px; }
.name { font-weight: 650; font-size: 13.5px; }
.spacer { flex: 1; }
.chip {
  font-size: 11px;
  color: var(--m-muted);
  background: var(--m-surface-2);
  border: 1px solid var(--m-line);
  padding: 3px 8px;
  border-radius: 7px;
}
.panel-body { flex: 1; overflow-y: auto; padding: 14px 12px; display: flex; flex-direction: column; gap: 10px; }
.msg { display: flex; }
.bubble {
  background: var(--m-surface-2);
  border-radius: 12px;
  padding: 10px 12px;
  line-height: 1.6;
  max-width: 90%;
}
.notice {
  font-size: 12px;
  color: var(--m-muted);
  background: var(--m-primary-soft);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  padding: 10px 12px;
  line-height: 1.6;
}
.composer { border-top: 1px solid var(--m-line); padding: 8px; background: var(--m-surface); }
.input-box { border: 1px solid var(--m-line); border-radius: 12px; padding: 8px 8px 6px; background: var(--m-surface); }
.input-box textarea {
  width: 100%;
  border: 0;
  outline: none;
  resize: none;
  font: inherit;
  height: 21px;
  background: transparent;
  color: var(--m-ink);
}
.tools-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
.send {
  width: 24px; height: 24px; border: 0; border-radius: 7px;
  background: var(--m-primary); color: var(--m-primary-ink);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.send:disabled { opacity: .45; cursor: not-allowed; }
</style>

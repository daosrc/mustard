<script setup lang="ts">
import type { Settings } from '@mustard/shared'
import { send } from '@mustard/platform'
import { onMounted, ref } from 'vue'
import { BALL_ICON } from '../content/ball'

const settings = ref<Settings | null>(null)

onMounted(async () => {
  settings.value = await send({ type: 'GET_SETTINGS' })
})

async function toggle<K extends keyof Settings['features']>(key: K) {
  if (!settings.value)
    return
  const features = { ...settings.value.features, [key]: !settings.value.features[key] }
  settings.value = await send({ type: 'UPDATE_SETTINGS', payload: { features } })
}
</script>

<template>
  <div class="page">
    <header class="head">
      <img class="mark" :src="BALL_ICON" alt="Mustard">
      <div>
        <h1>Mustard 芥末 · 设置</h1>
        <p class="sub">
          完整设置界面（模型提供商、离线词典、悬浮球工具、生词本等）将在 M4/M8 实现。
        </p>
      </div>
    </header>

    <section class="card">
      <h2>功能开关</h2>
      <label class="row">
        <span>网页翻译</span>
        <input type="checkbox" :checked="settings?.features.pageTranslate" @change="toggle('pageTranslate')">
      </label>
      <label class="row">
        <span>划词翻译</span>
        <input type="checkbox" :checked="settings?.features.selectionTranslate" @change="toggle('selectionTranslate')">
      </label>
      <label class="row">
        <span>悬浮翻译</span>
        <input type="checkbox" :checked="settings?.features.hoverTranslate" @change="toggle('hoverTranslate')">
      </label>
    </section>

    <section class="card">
      <h2>模型提供商</h2>
      <pre>{{ settings?.providers.map(p => p.name).join('\n') }}</pre>
      <p class="hint">
        默认 OpenCode Zen 为占位配置，需在后续版本填入 API Key。
      </p>
    </section>
  </div>
</template>

<style scoped>
.page { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
.head { display: flex; gap: 14px; align-items: center; margin-bottom: 24px; }
.mark { width: 44px; height: 44px; border-radius: 12px; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--m-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.card {
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 16px;
}
.card h2 { font-size: 14px; margin: 0 0 12px; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--m-line); }
.row:last-child { border-bottom: 0; }
pre { background: var(--m-surface-2); padding: 10px 12px; border-radius: 10px; font-size: 12px; overflow: auto; }
.hint { color: var(--m-muted); font-size: 12px; margin: 10px 0 0; }
</style>

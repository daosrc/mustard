<script setup lang="ts">
import type { Settings, ThemeMode } from '@mustard/shared'
import { send } from '@mustard/platform'
import { MField, MSelect, MSwitch, MToastHost, useToast } from '@mustard/ui'
import { onMounted, ref } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { BALL_ICON } from '../content/ball'

useTheme()
const { success } = useToast()

const settings = ref<Settings | null>(null)
const theme = ref<ThemeMode>('system')

const themeOptions = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

onMounted(async () => {
  settings.value = await send({ type: 'GET_SETTINGS' })
  theme.value = settings.value.theme
})

async function toggle<K extends keyof Settings['features']>(key: K) {
  if (!settings.value)
    return
  const features = { ...settings.value.features, [key]: !settings.value.features[key] }
  settings.value = await send({ type: 'UPDATE_SETTINGS', payload: { features } })
}

async function persistTheme(value?: string) {
  if (!value)
    return
  settings.value = await send({ type: 'UPDATE_SETTINGS', payload: { theme: value as ThemeMode } })
  success('已更新主题')
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

    <section class="m-card card">
      <h2>功能开关</h2>
      <MField inline label="网页翻译">
        <MSwitch :model-value="!!settings?.features.pageTranslate" @update:model-value="toggle('pageTranslate')" />
      </MField>
      <MField inline label="划词翻译">
        <MSwitch :model-value="!!settings?.features.selectionTranslate" @update:model-value="toggle('selectionTranslate')" />
      </MField>
      <MField inline label="悬浮翻译">
        <MSwitch :model-value="!!settings?.features.hoverTranslate" @update:model-value="toggle('hoverTranslate')" />
      </MField>
    </section>

    <section class="m-card card">
      <h2>外观</h2>
      <MField inline label="主题">
        <MSelect v-model="theme" :options="themeOptions" size="sm" @update:model-value="persistTheme" />
      </MField>
    </section>

    <section class="m-card card">
      <h2>模型提供商</h2>
      <pre>{{ settings?.providers.map(p => p.name).join('\n') }}</pre>
      <p class="m-muted hint">
        默认 OpenCode Zen 为占位配置，需在后续版本填入 API Key。
      </p>
    </section>

    <MToastHost />
  </div>
</template>

<style scoped>
.page { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
.head { display: flex; gap: 14px; align-items: center; margin-bottom: 24px; }
.mark { width: 44px; height: 44px; border-radius: 12px; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--m-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.card { padding: 16px 18px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px; }
.card h2 { font-size: 14px; margin: 0 0 2px; }
pre { background: var(--m-surface-2); padding: 10px 12px; border-radius: 10px; font-size: 12px; overflow: auto; margin: 0; }
.hint { margin: 0; }
</style>

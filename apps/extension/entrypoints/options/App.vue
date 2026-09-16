<script setup lang="ts">
import type { Provider, Settings } from '@mustard/shared'
import { LANGS, SOURCE_LANGS } from '@mustard/shared'
import { MButton, MChip, MField, MIcon, MSelect, MSwitch, MTabs, MToastHost, useToast } from '@mustard/ui'
import { uid } from '@mustard/utils'
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '../../lib/useTheme'
import { useSettingsStore } from '../../stores/settings'
import { BALL_ICON } from '../content/ball'
import ProviderDialog from './ProviderDialog.vue'

useTheme()
const store = useSettingsStore()
const { success, error } = useToast()

const tabs = [
  { key: 'providers', label: '模型', icon: 'sparkles' },
  { key: 'translate', label: '翻译', icon: 'translate' },
  { key: 'ball', label: '悬浮球', icon: 'globe' },
  { key: 'vocab', label: '生词本', icon: 'book' },
  { key: 'appearance', label: '外观', icon: 'settings' },
]
const active = ref('providers')
const theme = ref<'system' | 'light' | 'dark'>('system')

const themeOptions = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]
const targetOptions = LANGS.map(l => ({ label: l.label, value: l.code }))
const sourceOptions = SOURCE_LANGS.map(l => ({ label: l.label, value: l.code }))
const scopeOptions = [
  { label: '仅单词', value: 'word' },
  { label: '整句', value: 'sentence' },
]
const positionOptions = [
  { label: '右下角', value: 'right' },
  { label: '左下角', value: 'left' },
]
const expandOptions = [
  { label: '径向展开', value: 'radial' },
  { label: '纵向排列', value: 'stack' },
]

onMounted(async () => {
  await store.load()
  theme.value = store.settings?.theme ?? 'system'
})

const modelOptions = computed(() => (store.settings?.providers ?? []).flatMap(p => p.models.map(m => ({
  label: `${p.name} · ${m.name}`,
  value: `${p.id}::${m.name}`,
}))))
const activeModelValue = computed(() => store.settings ? `${store.settings.activeProviderId}::${store.settings.activeModel}` : undefined)
const providers = computed<Provider[]>(() => store.settings?.providers ?? [])

function setFeature<K extends keyof Settings['features']>(key: K, value: boolean): void {
  if (store.settings)
    void store.patch({ features: { ...store.settings.features, [key]: value } })
}

function setHover(patch: Partial<Settings['hover']>): void {
  if (store.settings)
    void store.patch({ hover: { ...store.settings.hover, ...patch } })
}

function setBall(patch: Partial<Settings['floatingBall']>): void {
  if (store.settings)
    void store.patch({ floatingBall: { ...store.settings.floatingBall, ...patch } })
}

function setVocab(patch: Partial<Settings['vocab']>): void {
  if (store.settings)
    void store.patch({ vocab: { ...store.settings.vocab, ...patch } })
}

function setActiveModel(value?: string): void {
  if (!value)
    return
  const [providerId, model] = value.split('::')
  if (providerId && model)
    void store.patch({ activeProviderId: providerId, activeModel: model })
}

function setTarget(value?: string): void {
  if (value)
    void store.patch({ targetLang: value as Settings['targetLang'] })
}

function setSource(value?: string): void {
  if (value)
    void store.patch({ sourceLang: value as Settings['sourceLang'] })
}

function setTheme(value?: string): void {
  if (!value)
    return
  theme.value = value as Settings['theme']
  void store.patch({ theme: value as Settings['theme'] })
}

function moveTool(index: number, dir: -1 | 1): void {
  if (!store.settings)
    return
  const tools = [...store.settings.floatingBall.tools]
  const next = index + dir
  if (next < 0 || next >= tools.length)
    return
  const current = tools[index]!
  tools[index] = tools[next]!
  tools[next] = current
  setBall({ tools: tools.map((t, i) => ({ ...t, order: i })) })
}

function toggleTool(id: string): void {
  if (!store.settings)
    return
  setBall({ tools: store.settings.floatingBall.tools.map(t => t.id === id ? { ...t, visible: !t.visible } : t) })
}

const dialogOpen = ref(false)
const editing = ref<Provider | null>(null)

function openEdit(provider: Provider): void {
  editing.value = structuredClone(provider)
  dialogOpen.value = true
}

function addProvider(): void {
  editing.value = { id: uid('p-'), name: '新提供商', baseUrl: 'https://', apiKey: '', models: [] }
  dialogOpen.value = true
}

function onSaveProvider(provider: Provider): void {
  if (!store.settings)
    return
  const exists = store.settings.providers.some(p => p.id === provider.id)
  const next = exists
    ? store.settings.providers.map(p => p.id === provider.id ? provider : p)
    : [...store.settings.providers, provider]
  void store.patch({ providers: next })
  success('已保存提供商')
}

function removeProvider(provider: Provider): void {
  if (provider.builtin || !store.settings)
    return
  const next = store.settings.providers.filter(p => p.id !== provider.id)
  if (!next.length) {
    error('至少保留一个提供商')
    return
  }
  const patch: Partial<Settings> = { providers: next }
  if (store.settings.activeProviderId === provider.id) {
    patch.activeProviderId = next[0]!.id
    patch.activeModel = next[0]!.models[0]?.name ?? ''
  }
  void store.patch(patch)
}
</script>

<template>
  <div class="page">
    <header class="head">
      <img class="mark" :src="BALL_ICON" alt="Mustard">
      <div>
        <h1>Mustard 芥末 · 设置</h1>
        <p class="sub">
          模型提供商、翻译、悬浮球、生词本与外观。离线词典管理将在 M8 实现。
        </p>
      </div>
    </header>

    <MTabs v-model="active" :tabs="tabs" class="tabs" />

    <!-- 模型 -->
    <section v-if="active === 'providers'" class="stack">
      <div class="m-card card">
        <MField inline label="当前模型">
          <MSelect :model-value="activeModelValue" :options="modelOptions" size="sm" placeholder="选择模型" @update:model-value="setActiveModel" />
        </MField>
        <p class="m-muted">
          附件入口由当前模型的输入能力决定：仅当支持「图片/附件」时才可上传与粘贴截图。
        </p>
      </div>

      <div class="section-head">
        <h2>提供商</h2>
        <MButton variant="ghost" @click="addProvider">
          <MIcon name="plus" :size="14" />
          添加提供商
        </MButton>
      </div>

      <div v-for="provider in providers" :key="provider.id" class="m-card provider">
        <div class="p-head">
          <span class="dot" :class="{ on: !!provider.apiKey }" :title="provider.apiKey ? '已配置 Key' : '未配置 Key'" />
          <span class="p-name">{{ provider.name }}</span>
          <MChip v-if="provider.builtin" variant="primary">
            内置
          </MChip>
          <span class="spacer" />
          <button class="icon-btn" title="编辑" @click="openEdit(provider)">
            <MIcon name="chevron-right" :size="15" />
          </button>
          <button v-if="!provider.builtin" class="icon-btn" title="删除" @click="removeProvider(provider)">
            <MIcon name="trash" :size="15" />
          </button>
        </div>
        <div class="p-models">
          <div v-for="model in provider.models" :key="model.id" class="p-model">
            <span class="m-name">{{ model.name }}</span>
            <MChip v-if="model.inputs.text">
              文本
            </MChip>
            <MChip v-if="model.inputs.image" variant="primary">
              图片
            </MChip>
            <MChip v-if="model.inputs.file" variant="primary">
              附件
            </MChip>
          </div>
          <p v-if="!provider.models.length" class="m-muted">
            暂无模型，点击右侧箭头添加。
          </p>
        </div>
      </div>
    </section>

    <!-- 翻译 -->
    <section v-else-if="active === 'translate'" class="stack">
      <div class="m-card card">
        <MField inline label="源语言">
          <MSelect :model-value="store.settings?.sourceLang" :options="sourceOptions" size="sm" @update:model-value="setSource" />
        </MField>
        <MField inline label="目标语言">
          <MSelect :model-value="store.settings?.targetLang" :options="targetOptions" size="sm" @update:model-value="setTarget" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>功能开关</h2>
        <MField inline label="网页翻译">
          <MSwitch :model-value="!!store.settings?.features.pageTranslate" @update:model-value="v => setFeature('pageTranslate', v)" />
        </MField>
        <MField inline label="划词翻译">
          <MSwitch :model-value="!!store.settings?.features.selectionTranslate" @update:model-value="v => setFeature('selectionTranslate', v)" />
        </MField>
        <MField inline label="悬浮翻译">
          <MSwitch :model-value="!!store.settings?.features.hoverTranslate" @update:model-value="v => setFeature('hoverTranslate', v)" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>悬浮翻译</h2>
        <MField inline :label="`触发延迟 ${store.settings?.hover.delay ?? 450}ms`">
          <input
            class="slider"
            type="range"
            min="200"
            max="1000"
            step="50"
            :value="store.settings?.hover.delay ?? 450"
            @input="setHover({ delay: Number(($event.target as HTMLInputElement).value) })"
          >
        </MField>
        <MField inline label="取词范围">
          <MSelect :model-value="store.settings?.hover.scope" :options="scopeOptions" size="sm" @update:model-value="v => v && setHover({ scope: v as Settings['hover']['scope'] })" />
        </MField>
      </div>
    </section>

    <!-- 悬浮球 -->
    <section v-else-if="active === 'ball'" class="stack">
      <div class="m-card card">
        <MField inline label="启用悬浮球">
          <MSwitch :model-value="!!store.settings?.floatingBall.enabled" @update:model-value="v => setBall({ enabled: v })" />
        </MField>
        <MField inline label="位置">
          <MSelect :model-value="store.settings?.floatingBall.position" :options="positionOptions" size="sm" @update:model-value="v => v && setBall({ position: v as Settings['floatingBall']['position'] })" />
        </MField>
        <MField inline label="展开方式">
          <MSelect :model-value="store.settings?.floatingBall.expand" :options="expandOptions" size="sm" @update:model-value="v => v && setBall({ expand: v as Settings['floatingBall']['expand'] })" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>工具管理</h2>
        <div v-for="(tool, index) in store.settings?.floatingBall.tools ?? []" :key="tool.id" class="tool-row">
          <span class="drag">⠿</span>
          <span class="t-label">{{ tool.label }}</span>
          <MChip v-if="tool.type === 'toggle'">
            开关
          </MChip>
          <span class="spacer" />
          <button class="icon-btn" title="上移" :disabled="index === 0" @click="moveTool(index, -1)">
            <MIcon name="chevron-left" :size="14" class="rot90" />
          </button>
          <button class="icon-btn" title="下移" :disabled="index === (store.settings?.floatingBall.tools.length ?? 0) - 1" @click="moveTool(index, 1)">
            <MIcon name="chevron-left" :size="14" class="rot270" />
          </button>
          <MSwitch :model-value="tool.visible" @update:model-value="() => toggleTool(tool.id)" />
        </div>
      </div>
    </section>

    <!-- 生词本 -->
    <section v-else-if="active === 'vocab'" class="stack">
      <div class="m-card card">
        <MField inline label="翻译单词后自动收录">
          <MSwitch :model-value="!!store.settings?.vocab.autoAdd" @update:model-value="v => setVocab({ autoAdd: v })" />
        </MField>
        <MField inline label="仅收录单词（非整句）">
          <MSwitch :model-value="!!store.settings?.vocab.wordOnly" @update:model-value="v => setVocab({ wordOnly: v })" />
        </MField>
        <p class="m-muted">
          导入 / 导出与列表管理将在 M5 实现。
        </p>
      </div>
    </section>

    <!-- 外观 -->
    <section v-else class="stack">
      <div class="m-card card">
        <MField inline label="主题">
          <MSelect :model-value="theme" :options="themeOptions" size="sm" @update:model-value="setTheme" />
        </MField>
        <p class="m-muted">
          界面语言与快捷键自定义将在 M10 实现。
        </p>
      </div>
    </section>

    <ProviderDialog v-model="dialogOpen" :provider="editing" @save="onSaveProvider" />
    <MToastHost />
  </div>
</template>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
.head { display: flex; gap: 14px; align-items: center; margin-bottom: 20px; }
.mark { width: 44px; height: 44px; border-radius: 12px; }
h1 { font-size: 20px; margin: 0 0 4px; }
.sub { color: var(--m-muted); font-size: 13px; margin: 0; line-height: 1.6; }
.tabs { margin-bottom: 18px; }
.stack { display: flex; flex-direction: column; gap: 14px; }
.card { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.card h2 { font-size: 14px; margin: 0; }
.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-head h2 { font-size: 14px; margin: 0; }
.provider { gap: 10px; }
.p-head { display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--m-faint); flex: none; }
.dot.on { background: var(--m-primary); }
.p-name { font-weight: 650; font-size: 13.5px; }
.spacer { flex: 1; }
.p-models { display: flex; flex-direction: column; gap: 6px; padding-left: 16px; }
.p-model { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.m-name { font-size: 12.5px; color: var(--m-ink); }
.icon-btn {
  border: 0;
  padding: 5px;
  border-radius: 7px;
  background: transparent;
  color: var(--m-muted);
  display: inline-flex;
  cursor: pointer;
}
.icon-btn:hover:not(:disabled) { background: var(--m-surface-2); color: var(--m-ink); }
.icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.slider { width: 160px; accent-color: var(--m-primary); }
.tool-row { display: flex; align-items: center; gap: 8px; }
.drag { color: var(--m-faint); cursor: default; }
.t-label { font-size: 13px; color: var(--m-ink); }
.rot90 { transform: rotate(90deg); }
.rot270 { transform: rotate(-90deg); }
</style>

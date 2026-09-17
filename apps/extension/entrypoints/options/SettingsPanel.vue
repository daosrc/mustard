<script setup lang="ts">
import type { DictInstallStatus, DictionaryItem, Provider, Settings, UILang } from '@mustard/shared'
import { send } from '@mustard/platform'
import { DICTIONARIES, LANGS, SOURCE_LANGS, UI_LANGS } from '@mustard/shared'
import { MButton, MChip, MDialog, MField, MIcon, MSelect, MSwitch, MTabs, useToast } from '@mustard/ui'
import { uid } from '@mustard/utils'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/settings'
import ProviderDialog from './ProviderDialog.vue'

const store = useSettingsStore()
const { success, error } = useToast()
const { t } = useI18n()

const tabs = computed(() => [
  { key: 'providers', label: t('options.tabProviders'), icon: 'sparkles' },
  { key: 'translate', label: t('options.tabTranslate'), icon: 'translate' },
  { key: 'ball', label: t('options.tabBall'), icon: 'globe' },
  { key: 'vocab', label: t('options.tabVocab'), icon: 'book' },
  { key: 'dict', label: t('options.tabDict'), icon: 'search' },
  { key: 'appearance', label: t('options.tabAppearance'), icon: 'settings' },
])
const uiLangOptions = UI_LANGS.map(l => ({ label: l.label, value: l.code }))

function setUILang(value?: string): void {
  if (value)
    void store.patch({ uiLang: value as UILang })
}
const active = ref('providers')
const theme = ref<'system' | 'light' | 'dark'>('system')

const themeOptions = computed(() => [
  { label: t('options.themeSystem'), value: 'system' },
  { label: t('options.themeLight'), value: 'light' },
  { label: t('options.themeDark'), value: 'dark' },
])
const targetOptions = LANGS.map(l => ({ label: l.label, value: l.code }))
const sourceOptions = SOURCE_LANGS.map(l => ({ label: l.label, value: l.code }))
const scopeOptions = computed(() => [
  { label: t('options.scopeWord'), value: 'word' },
  { label: t('options.scopeSentence'), value: 'sentence' },
])
const positionOptions = computed(() => [
  { label: t('options.ballRight'), value: 'right' },
  { label: t('options.ballLeft'), value: 'left' },
])
const expandOptions = computed(() => [
  { label: t('options.ballRadial'), value: 'radial' },
  { label: t('options.ballStack'), value: 'stack' },
])

onMounted(async () => {
  if (!store.settings)
    await store.load()
  theme.value = store.settings?.theme ?? 'system'
  await loadDictStatus()
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
  editing.value = { id: uid('p-'), name: 'New provider', baseUrl: 'https://', apiKey: '', models: [] }
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
  success(t('options.providerSaved'))
}

function removeProvider(provider: Provider): void {
  if (provider.builtin || !store.settings)
    return
  const next = store.settings.providers.filter(p => p.id !== provider.id)
  if (!next.length) {
    error(t('options.keepOneProvider'))
    return
  }
  const patch: Partial<Settings> = { providers: next }
  if (store.settings.activeProviderId === provider.id) {
    patch.activeProviderId = next[0]!.id
    patch.activeModel = next[0]!.models[0]?.name ?? ''
  }
  void store.patch(patch)
}

function toolLabel(id: string, fallback: string): string {
  const key = `content.tool.${id}`
  const value = t(key)
  return value === key ? fallback : value
}

type DictState = Settings['dictionaries'][string]

function dictState(id: string): DictState {
  return store.settings?.dictionaries[id] ?? { installed: false, enabled: false }
}

const dictList = DICTIONARIES
const dictDialogOpen = ref(false)
const dictStatuses = ref<Record<string, DictInstallStatus>>({})
let pollTimer: ReturnType<typeof setInterval> | undefined

function dictStatusOf(id: string): DictInstallStatus {
  return dictStatuses.value[id] ?? { id, installed: dictState(id).installed, enabled: dictState(id).enabled, progress: null }
}

const installedCount = computed(() => DICTIONARIES.filter(d => dictStatusOf(d.id).installed).length)
const enabledCount = computed(() => DICTIONARIES.filter(d => dictStatusOf(d.id).installed && dictStatusOf(d.id).enabled).length)

function hasSource(dict: DictionaryItem): boolean {
  return !!dict.format && (!!dict.url || !!dict.perLetter)
}

async function loadDictStatus(): Promise<void> {
  const list = await send({ type: 'GET_DICT_STATUS' })
  dictStatuses.value = Object.fromEntries(list.map(s => [s.id, s]))
  const busy = list.some(s => s.progress !== null)
  if (busy && !pollTimer) {
    pollTimer = setInterval(loadDictStatus, 700)
  }
  else if (!busy && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

onBeforeUnmount(() => {
  if (pollTimer)
    clearInterval(pollTimer)
})

function toggleDict(id: string, enabled: boolean): void {
  if (!store.settings)
    return
  void store.patch({ dictionaries: { ...store.settings.dictionaries, [id]: { ...dictState(id), enabled } } })
}

async function downloadDict(dict: DictionaryItem): Promise<void> {
  void loadDictStatus()
  const res = await send({ type: 'DICT_INSTALL', payload: { id: dict.id } })
  if (res.ok)
    success(t('options.dictDownloaded'))
  else
    error(res.error === 'NO_SOURCE' ? t('options.dictNoSource') : t('options.dictFailed', { error: res.error ?? '' }))
  await loadDictStatus()
}

async function removeDictPack(id: string): Promise<void> {
  await send({ type: 'DICT_REMOVE', payload: { id } })
  await store.load()
  success(t('options.dictRemoved'))
  await loadDictStatus()
}
</script>

<template>
  <div class="settings">
    <MTabs v-model="active" :tabs="tabs" class="tabs" />

    <!-- 模型 -->
    <section v-if="active === 'providers'" class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.currentModel')">
          <MSelect :model-value="activeModelValue" :options="modelOptions" size="sm" :placeholder="t('chat.modelPlaceholder')" @update:model-value="setActiveModel" />
        </MField>
        <p class="m-muted">
          {{ t('options.modelHint') }}
        </p>
      </div>

      <div class="section-head">
        <h2>{{ t('options.providers') }}</h2>
        <MButton variant="ghost" @click="addProvider">
          <MIcon name="plus" :size="14" />
          {{ t('options.addProvider') }}
        </MButton>
      </div>

      <div v-for="provider in providers" :key="provider.id" class="m-card provider">
        <div class="p-head">
          <span class="dot" :class="{ on: !!provider.apiKey }" :title="provider.apiKey ? t('options.keySet') : t('options.keyUnset')" />
          <span class="p-name">{{ provider.name }}</span>
          <MChip v-if="provider.builtin" variant="primary">
            {{ t('options.builtin') }}
          </MChip>
          <span class="spacer" />
          <button class="icon-btn" :title="t('options.edit')" @click="openEdit(provider)">
            <MIcon name="chevron-right" :size="15" />
          </button>
          <button v-if="!provider.builtin" class="icon-btn" :title="t('options.delete')" @click="removeProvider(provider)">
            <MIcon name="trash" :size="15" />
          </button>
        </div>
        <div class="p-models">
          <div v-for="model in provider.models" :key="model.id" class="p-model">
            <span class="m-name">{{ model.name }}</span>
            <MChip v-if="model.inputs.text">
              {{ t('options.capText') }}
            </MChip>
            <MChip v-if="model.inputs.image" variant="primary">
              {{ t('options.capImage') }}
            </MChip>
            <MChip v-if="model.inputs.file" variant="primary">
              {{ t('options.capFile') }}
            </MChip>
          </div>
          <p v-if="!provider.models.length" class="m-muted">
            {{ t('options.noModels') }}
          </p>
        </div>
      </div>
    </section>

    <!-- 翻译 -->
    <section v-else-if="active === 'translate'" class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.sourceLang')">
          <MSelect :model-value="store.settings?.sourceLang" :options="sourceOptions" size="sm" @update:model-value="setSource" />
        </MField>
        <MField inline :label="t('options.targetLang')">
          <MSelect :model-value="store.settings?.targetLang" :options="targetOptions" size="sm" @update:model-value="setTarget" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>{{ t('options.features') }}</h2>
        <MField inline :label="t('options.pageTranslate')">
          <MSwitch :model-value="!!store.settings?.features.pageTranslate" @update:model-value="v => setFeature('pageTranslate', v)" />
        </MField>
        <MField inline :label="t('options.selectionTranslate')">
          <MSwitch :model-value="!!store.settings?.features.selectionTranslate" @update:model-value="v => setFeature('selectionTranslate', v)" />
        </MField>
        <MField inline :label="t('options.hoverTranslate')">
          <MSwitch :model-value="!!store.settings?.features.hoverTranslate" @update:model-value="v => setFeature('hoverTranslate', v)" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>{{ t('options.hover') }}</h2>
        <MField inline :label="t('options.hoverDelay', { ms: store.settings?.hover.delay ?? 450 })">
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
        <MField inline :label="t('options.hoverScope')">
          <MSelect :model-value="store.settings?.hover.scope" :options="scopeOptions" size="sm" @update:model-value="v => v && setHover({ scope: v as Settings['hover']['scope'] })" />
        </MField>
      </div>
    </section>

    <!-- 悬浮球 -->
    <section v-else-if="active === 'ball'" class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.ballEnabled')">
          <MSwitch :model-value="!!store.settings?.floatingBall.enabled" @update:model-value="v => setBall({ enabled: v })" />
        </MField>
        <MField inline :label="t('options.ballPosition')">
          <MSelect :model-value="store.settings?.floatingBall.position" :options="positionOptions" size="sm" @update:model-value="v => v && setBall({ position: v as Settings['floatingBall']['position'] })" />
        </MField>
        <MField inline :label="t('options.ballExpand')">
          <MSelect :model-value="store.settings?.floatingBall.expand" :options="expandOptions" size="sm" @update:model-value="v => v && setBall({ expand: v as Settings['floatingBall']['expand'] })" />
        </MField>
      </div>

      <div class="m-card card">
        <h2>{{ t('options.tools') }}</h2>
        <div v-for="(tool, index) in store.settings?.floatingBall.tools ?? []" :key="tool.id" class="tool-row">
          <span class="drag">⠿</span>
          <span class="t-label">{{ toolLabel(tool.id, tool.label) }}</span>
          <MChip v-if="tool.type === 'toggle'">
            {{ t('options.toolToggle') }}
          </MChip>
          <span class="spacer" />
          <button class="icon-btn" :title="t('options.moveUp')" :disabled="index === 0" @click="moveTool(index, -1)">
            <MIcon name="chevron-left" :size="14" class="rot90" />
          </button>
          <button class="icon-btn" :title="t('options.moveDown')" :disabled="index === (store.settings?.floatingBall.tools.length ?? 0) - 1" @click="moveTool(index, 1)">
            <MIcon name="chevron-left" :size="14" class="rot270" />
          </button>
          <MSwitch :model-value="tool.visible" @update:model-value="() => toggleTool(tool.id)" />
        </div>
      </div>
    </section>

    <!-- 生词本 -->
    <section v-else-if="active === 'vocab'" class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.vocabAutoAdd')">
          <MSwitch :model-value="!!store.settings?.vocab.autoAdd" @update:model-value="v => setVocab({ autoAdd: v })" />
        </MField>
        <MField inline :label="t('options.vocabWordOnly')">
          <MSwitch :model-value="!!store.settings?.vocab.wordOnly" @update:model-value="v => setVocab({ wordOnly: v })" />
        </MField>
        <p class="m-muted">
          {{ t('options.vocabHint') }}
        </p>
      </div>
    </section>

    <!-- 词典 -->
    <section v-else-if="active === 'dict'" class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.onlineFallback')" :hint="t('options.onlineFallbackHint')">
          <MSwitch :model-value="!!store.settings?.onlineDictionaryFallback" @update:model-value="v => store.patch({ onlineDictionaryFallback: v })" />
        </MField>
        <div class="m-row">
          <span class="m-muted">{{ t('options.dictSummary', { installed: installedCount, total: dictList.length, enabled: enabledCount }) }}</span>
          <MButton variant="ghost" @click="dictDialogOpen = true">
            <MIcon name="book" :size="14" />
            {{ t('options.manageDict') }}
          </MButton>
        </div>
        <p class="m-muted">
          {{ t('options.dictOrderHint') }}
        </p>
      </div>
    </section>

    <!-- 外观 -->
    <section v-else class="stack">
      <div class="m-card card">
        <MField inline :label="t('options.theme')">
          <MSelect :model-value="theme" :options="themeOptions" size="sm" @update:model-value="setTheme" />
        </MField>
        <MField inline :label="t('options.uiLang')">
          <MSelect :model-value="store.settings?.uiLang" :options="uiLangOptions" size="sm" @update:model-value="setUILang" />
        </MField>
      </div>
    </section>

    <MDialog v-model="dictDialogOpen" :title="t('options.manageDict')" width="540px">
      <div class="dict-list">
        <div v-for="dict in dictList" :key="dict.id" class="dict-item">
          <div class="d-main">
            <div class="d-name">
              {{ dict.name }}
              <MChip v-if="dict.perLetter" variant="primary">
                {{ t('options.dictLazy') }}
              </MChip>
            </div>
            <div class="m-muted">
              {{ dict.langPair }} · {{ dict.size }} · {{ dict.license }}
            </div>
            <div v-if="dictStatusOf(dict.id).error" class="d-err">
              {{ t('options.dictFailed', { error: dictStatusOf(dict.id).error ?? '' }) }}
            </div>
          </div>
          <div class="d-actions">
            <MSwitch :model-value="dictStatusOf(dict.id).enabled" @update:model-value="v => toggleDict(dict.id, v)" />
            <template v-if="dictStatusOf(dict.id).progress !== null">
              <div class="d-progress">
                <i :style="{ width: `${Math.round((dictStatusOf(dict.id).progress ?? 0) * 100)}%` }" />
              </div>
              <span class="d-pct">{{ Math.round((dictStatusOf(dict.id).progress ?? 0) * 100) }}%</span>
            </template>
            <button v-else-if="dictStatusOf(dict.id).installed" class="icon-btn" :title="t('options.dictDelete')" @click="removeDictPack(dict.id)">
              <MIcon name="trash" :size="15" />
            </button>
            <MButton v-else variant="ghost" :disabled="!hasSource(dict)" :title="hasSource(dict) ? t('options.dictDownload') : t('options.dictNoSource')" @click="downloadDict(dict)">
              {{ t('options.dictDownload') }}
            </MButton>
          </div>
        </div>
      </div>
      <p class="m-muted license">
        {{ t('options.dictLicense') }}
      </p>
    </MDialog>

    <ProviderDialog v-model="dialogOpen" :provider="editing" @save="onSaveProvider" />
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; }
.tabs { margin-bottom: 14px; }
.stack { display: flex; flex-direction: column; gap: 12px; }
.card { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
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
.slider { width: 140px; accent-color: var(--m-primary); }
.tool-row { display: flex; align-items: center; gap: 8px; }
.drag { color: var(--m-faint); cursor: default; }
.t-label { font-size: 13px; color: var(--m-ink); }
.rot90 { transform: rotate(90deg); }
.rot270 { transform: rotate(-90deg); }
.dict-list { display: flex; flex-direction: column; gap: 8px; }
.dict-item { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--m-line); border-radius: 10px; }
.d-main { flex: 1; min-width: 0; }
.d-name { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.d-actions { display: flex; align-items: center; gap: 6px; }
.d-err { color: var(--m-blush); font-size: 11.5px; margin-top: 3px; }
.d-progress { width: 84px; height: 6px; border-radius: 999px; background: var(--m-surface-2); overflow: hidden; }
.d-progress i { display: block; height: 100%; background: var(--m-primary); transition: width .2s; }
.d-pct { font-size: 11.5px; color: var(--m-muted); width: 32px; text-align: right; }
.license { margin: 12px 0 0; }
</style>

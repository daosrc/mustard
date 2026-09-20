<script setup lang="ts">
import type { DictInstallStatus, DictionaryItem, Provider, Settings, UILang } from '@mustard/shared'
import { send } from '@mustard/platform'
import { DICTIONARIES, LANGS, SOURCE_LANGS, UI_LANGS } from '@mustard/shared'
import { MButton, MChip, MDialog, MIcon, MSelect, MSwitch, useToast } from '@mustard/ui'
import { uid } from '@mustard/utils'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from '../../lib/i18n'
import { useSettingsStore } from '../../stores/settings'
import ProviderDialog from './ProviderDialog.vue'

withDefaults(defineProps<{ contained?: boolean }>(), { contained: false })

const store = useSettingsStore()
const { success, error } = useToast()
const { t } = useI18n()

const uiLangOptions = UI_LANGS.map(l => ({ label: l.label, value: l.code }))
function setUILang(value?: string): void {
  if (value)
    void store.patch({ uiLang: value as UILang })
}

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
const delayOptions = [
  { label: '300 ms', value: '300' },
  { label: '450 ms', value: '450' },
  { label: '700 ms', value: '700' },
  { label: '1000 ms', value: '1000' },
]
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

function maskKey(key: string): string {
  if (!key)
    return ''
  return key.length > 8 ? `${key.slice(0, 3)}••••••${key.slice(-4)}` : '••••••'
}

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
  setBall({ tools: tools.map((tool, i) => ({ ...tool, order: i })) })
}

function toggleTool(id: string): void {
  if (!store.settings)
    return
  setBall({ tools: store.settings.floatingBall.tools.map(tool => tool.id === id ? { ...tool, visible: !tool.visible } : tool) })
}

const dialogOpen = ref(false)
const editing = ref<Provider | null>(null)

function openEdit(provider: Provider): void {
  // 用纯对象深拷贝（store 里是 reactive 代理，structuredClone 会抛 DataCloneError）
  editing.value = JSON.parse(JSON.stringify(provider)) as Provider
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

const TOOL_ICON: Record<string, string> = {
  pageTranslate: 'globe',
  hoverTranslate: 'message',
  selectionTranslate: 'translate',
  vocab: 'book',
  settings: 'settings',
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
    <!-- 模型提供商 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.providers') }}
      </div>
      <div v-for="provider in providers" :key="provider.id" class="provider-card">
        <div class="p-top">
          <span class="dot" :class="{ on: !!provider.apiKey }" />
          <span class="p-name">{{ provider.name }}</span>
          <span class="conn">{{ provider.apiKey ? t('options.connected') : t('options.keyUnset') }}</span>
          <button class="icon-btn ml-auto" :title="t('options.edit')" @click="openEdit(provider)">
            <MIcon name="chevron-right" :size="15" />
          </button>
          <button v-if="!provider.builtin" class="icon-btn" :title="t('options.delete')" @click="removeProvider(provider)">
            <MIcon name="trash" :size="15" />
          </button>
        </div>
        <div class="p-url">
          {{ provider.baseUrl }}
        </div>
        <div v-if="provider.apiKey" class="p-key">
          {{ maskKey(provider.apiKey) }}
        </div>
        <div class="p-models">
          <div v-for="model in provider.models" :key="model.id" class="p-model">
            <span class="m-name">{{ model.name }}</span>
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
      <button class="add-provider" @click="addProvider">
        <MIcon name="plus" :size="14" />
        {{ t('options.addProvider') }}
      </button>
    </section>

    <!-- 当前模型 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.currentModel') }}
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.currentModel') }}
        </div>
        <MSelect :model-value="activeModelValue" :options="modelOptions" size="sm" :placeholder="t('chat.modelPlaceholder')" @update:model-value="setActiveModel" />
      </div>
      <p class="m-muted hint">
        {{ t('options.modelHint') }}
      </p>
    </section>

    <!-- 功能开关 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.features') }}
      </div>
      <div class="field">
        <div>
          <div class="lab">
            {{ t('options.pageTranslate') }}
          </div><div class="sub">
            {{ t('options.pageTranslateSub') }}
          </div>
        </div>
        <MSwitch :model-value="!!store.settings?.features.pageTranslate" @update:model-value="v => setFeature('pageTranslate', v)" />
      </div>
      <div class="field">
        <div>
          <div class="lab">
            {{ t('options.selectionTranslate') }}
          </div><div class="sub">
            {{ t('options.selectionTranslateSub') }}
          </div>
        </div>
        <MSwitch :model-value="!!store.settings?.features.selectionTranslate" @update:model-value="v => setFeature('selectionTranslate', v)" />
      </div>
      <div class="field">
        <div>
          <div class="lab">
            {{ t('options.hoverTranslate') }}
          </div><div class="sub">
            {{ t('options.hoverTranslateSub') }}
          </div>
        </div>
        <MSwitch :model-value="!!store.settings?.features.hoverTranslate" @update:model-value="v => setFeature('hoverTranslate', v)" />
      </div>
      <div class="field">
        <div>
          <div class="lab">
            {{ t('options.hoverDelayLabel') }}
          </div><div class="sub">
            {{ t('options.hoverDelaySub') }}
          </div>
        </div>
        <MSelect size="sm" :model-value="String(store.settings?.hover.delay ?? 450)" :options="delayOptions" @update:model-value="v => v && setHover({ delay: Number(v) })" />
      </div>
      <div class="field">
        <div>
          <div class="lab">
            {{ t('options.hoverScope') }}
          </div>
        </div>
        <MSelect size="sm" :model-value="store.settings?.hover.scope" :options="scopeOptions" @update:model-value="v => v && setHover({ scope: v as Settings['hover']['scope'] })" />
      </div>
    </section>

    <!-- 翻译 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tabTranslate') }}
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.sourceLang') }}
        </div>
        <MSelect size="sm" :model-value="store.settings?.sourceLang" :options="sourceOptions" @update:model-value="setSource" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.targetLang') }}
        </div>
        <MSelect size="sm" :model-value="store.settings?.targetLang" :options="targetOptions" @update:model-value="setTarget" />
      </div>
    </section>

    <!-- 离线词典 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tabDict') }}
      </div>
      <p class="m-muted hint">
        {{ t('options.dictOrderHint') }}
      </p>
      <div class="field">
        <div class="lab">
          {{ t('options.onlineFallback') }}
        </div>
        <MSwitch :model-value="!!store.settings?.onlineDictionaryFallback" @update:model-value="v => store.patch({ onlineDictionaryFallback: v })" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.dictSummary', { installed: installedCount, total: dictList.length, enabled: enabledCount }) }}
        </div>
      </div>
      <button class="manage-btn" @click="dictDialogOpen = true">
        <MIcon name="book" :size="15" />
        {{ t('options.manageDict') }}
      </button>
    </section>

    <!-- 悬浮球 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tabBall') }}
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.ballEnabled') }}
        </div>
        <MSwitch :model-value="!!store.settings?.floatingBall.enabled" @update:model-value="v => setBall({ enabled: v })" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.ballPosition') }}
        </div>
        <MSelect size="sm" :model-value="store.settings?.floatingBall.position" :options="positionOptions" @update:model-value="v => v && setBall({ position: v as Settings['floatingBall']['position'] })" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.ballExpand') }}
        </div>
        <MSelect size="sm" :model-value="store.settings?.floatingBall.expand" :options="expandOptions" @update:model-value="v => v && setBall({ expand: v as Settings['floatingBall']['expand'] })" />
      </div>
    </section>

    <!-- 工具菜单 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tools') }}
      </div>
      <div v-for="(tool, index) in store.settings?.floatingBall.tools ?? []" :key="tool.id" class="tool-row">
        <span class="drag">⠿</span>
        <MIcon class="tico" :name="TOOL_ICON[tool.id] ?? 'sparkles'" :size="14" />
        <span class="tlab">{{ toolLabel(tool.id, tool.label) }}</span>
        <span class="spacer" />
        <button class="icon-btn" :title="t('options.moveUp')" :disabled="index === 0" @click="moveTool(index, -1)">
          <MIcon name="chevron-left" :size="13" class="rot90" />
        </button>
        <button class="icon-btn" :title="t('options.moveDown')" :disabled="index === (store.settings?.floatingBall.tools.length ?? 0) - 1" @click="moveTool(index, 1)">
          <MIcon name="chevron-left" :size="13" class="rot270" />
        </button>
        <MSwitch :model-value="tool.visible" @update:model-value="() => toggleTool(tool.id)" />
      </div>
    </section>

    <!-- 生词本 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tabVocab') }}
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.vocabAutoAdd') }}
        </div>
        <MSwitch :model-value="!!store.settings?.vocab.autoAdd" @update:model-value="v => setVocab({ autoAdd: v })" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.vocabWordOnly') }}
        </div>
        <MSwitch :model-value="!!store.settings?.vocab.wordOnly" @update:model-value="v => setVocab({ wordOnly: v })" />
      </div>
      <p class="m-muted hint">
        {{ t('options.vocabHint') }}
      </p>
    </section>

    <!-- 通用 -->
    <section class="group">
      <div class="group-title">
        {{ t('options.tabAppearance') }}
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.theme') }}
        </div>
        <MSelect size="sm" :model-value="theme" :options="themeOptions" @update:model-value="setTheme" />
      </div>
      <div class="field">
        <div class="lab">
          {{ t('options.uiLang') }}
        </div>
        <MSelect size="sm" :model-value="store.settings?.uiLang" :options="uiLangOptions" @update:model-value="setUILang" />
      </div>
    </section>

    <MDialog v-model="dictDialogOpen" :title="t('options.manageDict')" :contained="contained" width="540px">
      <div class="dict-list">
        <div v-for="dict in dictList" :key="dict.id" class="dict-item">
          <div class="d-main">
            <div class="d-name">
              <span class="d-title">{{ dict.name }}</span>
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

    <ProviderDialog :key="editing?.id ?? 'none'" v-model="dialogOpen" :provider="editing" :contained="contained" @save="onSaveProvider" />
  </div>
</template>

<style scoped>
.settings { display: flex; flex-direction: column; gap: 14px; padding-bottom: 8px; }
.group { display: flex; flex-direction: column; gap: 8px; }
.group-title { font-size: 12px; font-weight: 700; color: var(--m-muted); letter-spacing: .02em; }
.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--m-surface);
  border: 1px solid var(--m-line);
  border-radius: 10px;
  padding: 9px 11px;
}
.field .lab { font-size: 13px; color: var(--m-ink); }
.field .sub { font-size: 11px; color: var(--m-muted); margin-top: 1px; }
.hint { margin: 0; }

.provider-card { background: var(--m-surface); border: 1px solid var(--m-line); border-radius: 10px; padding: 10px 11px; display: flex; flex-direction: column; gap: 5px; }
.p-top { display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--m-faint); flex: none; }
.dot.on { background: var(--m-primary); }
.p-name { font-size: 13.5px; font-weight: 650; }
.conn { font-size: 11px; color: var(--m-muted); }
.ml-auto { margin-left: auto; }
.p-url { font-size: 11.5px; color: var(--m-muted); word-break: break-all; }
.p-key { font-size: 11.5px; color: var(--m-faint); }
.p-models { display: flex; flex-direction: column; gap: 5px; }
.p-model { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.m-name { font-size: 12px; color: var(--m-ink); }

.add-provider {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  border: 1px dashed var(--m-line); border-radius: 10px;
  background: transparent; color: var(--m-primary);
  font-size: 12.5px; font-weight: 600; padding: 8px; cursor: pointer;
}
.add-provider:hover { border-color: var(--m-primary); background: var(--m-primary-soft); }

.manage-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 1px solid var(--m-line); border-radius: 10px;
  background: var(--m-surface); color: var(--m-ink);
  font-size: 12.5px; font-weight: 600; padding: 8px; cursor: pointer;
}
.manage-btn:hover { border-color: var(--m-primary); color: var(--m-primary); }

.tool-row { display: flex; align-items: center; gap: 8px; background: var(--m-surface); border: 1px solid var(--m-line); border-radius: 10px; padding: 7px 10px; }
.drag { color: var(--m-faint); cursor: default; }
.tico { color: var(--m-muted); }
.tlab { font-size: 12.5px; color: var(--m-ink); }
.spacer { flex: 1; }
.icon-btn {
  border: 0; padding: 5px; border-radius: 7px;
  background: transparent; color: var(--m-muted);
  display: inline-flex; cursor: pointer;
}
.icon-btn:hover:not(:disabled) { background: var(--m-surface-2); color: var(--m-ink); }
.icon-btn:disabled { opacity: .35; cursor: not-allowed; }
.rot90 { transform: rotate(90deg); }
.rot270 { transform: rotate(-90deg); }

.dict-list { display: flex; flex-direction: column; gap: 8px; }
.dict-item { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--m-line); border-radius: 10px; }
.d-main { flex: 1; min-width: 0; }
.d-name { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
.d-title { min-width: 0; }
.d-name :deep(.m-chip) { flex: none; white-space: nowrap; }
.d-actions { display: flex; align-items: center; gap: 6px; }
.d-err { color: var(--m-blush); font-size: 11.5px; margin-top: 3px; }
.d-progress { width: 84px; height: 6px; border-radius: 999px; background: var(--m-surface-2); overflow: hidden; }
.d-progress i { display: block; height: 100%; background: var(--m-primary); transition: width .2s; }
.d-pct { font-size: 11.5px; color: var(--m-muted); width: 32px; text-align: right; }
.license { margin: 12px 0 0; }
</style>

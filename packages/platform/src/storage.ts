import type { Settings } from '@mustard/shared'
import { DEFAULT_SETTINGS, DICTIONARIES, STORAGE_KEYS } from '@mustard/shared'
import { browser } from 'wxt/browser'

async function read<T>(key: string): Promise<T | undefined> {
  const data = await browser.storage.local.get(key)
  return data[key] as T | undefined
}

async function write<T>(key: string, value: T): Promise<void> {
  await browser.storage.local.set({ [key]: value })
}

/**
 * 读取设置（与默认值合并，保证新增字段可用）。
 * 内置提供商的模型列表以默认预设为准：补齐预设有、存储缺失的模型，
 * 并在 activeModel 失效时回退到默认，避免旧版本残留的占位模型名导致请求失败。
 */
export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(STORAGE_KEYS.settings)

  const storedProviders = (stored?.providers ?? DEFAULT_SETTINGS.providers)
    // 移除默认清单中已不存在的内置提供商
    .filter(provider => !provider.builtin || DEFAULT_SETTINGS.providers.some(p => p.id === provider.id))

  // 补齐默认中新增、而存储里缺失的内置提供商
  const providerMap = new Map(storedProviders.map(p => [p.id, p]))
  for (const preset of DEFAULT_SETTINGS.providers) {
    if (!providerMap.has(preset.id))
      providerMap.set(preset.id, preset)
  }

  const providers = [...providerMap.values()].map((provider) => {
    const preset = DEFAULT_SETTINGS.providers.find(p => p.id === provider.id && p.builtin)
    if (!preset)
      return provider
    const names = new Set(provider.models.map(m => m.name))
    return { ...provider, models: [...provider.models, ...preset.models.filter(m => !names.has(m.name))] }
  })

  const activeProviderId = stored?.activeProviderId ?? DEFAULT_SETTINGS.activeProviderId
  const activeModelName = stored?.activeModel ?? DEFAULT_SETTINGS.activeModel
  const activeProvider = providers.find(p => p.id === activeProviderId)
  const activeModelValid = activeProvider?.models.some(m => m.name === activeModelName)

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    providers,
    activeProviderId: activeProvider?.id ?? DEFAULT_SETTINGS.activeProviderId,
    activeModel: activeModelValid ? activeModelName : DEFAULT_SETTINGS.activeModel,
    features: { ...DEFAULT_SETTINGS.features, ...stored?.features },
    hover: { ...DEFAULT_SETTINGS.hover, ...stored?.hover },
    floatingBall: { ...DEFAULT_SETTINGS.floatingBall, ...stored?.floatingBall, tools: stored?.floatingBall?.tools ?? DEFAULT_SETTINGS.floatingBall.tools },
    vocab: { ...DEFAULT_SETTINGS.vocab, ...stored?.vocab },
    // 只保留当前清单里的词典：丢弃历史遗留 id，并给新增词典补上默认值
    dictionaries: Object.fromEntries(DICTIONARIES.map((d) => {
      const saved = stored?.dictionaries?.[d.id]
      return [d.id, { installed: saved?.installed ?? d.installed, enabled: saved?.enabled ?? d.enabled }]
    })),
  }
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch }
  await write(STORAGE_KEYS.settings, next)
  return next
}

export async function getStored<T>(key: string): Promise<T | undefined> {
  return read<T>(key)
}

export async function setStored<T>(key: string, value: T): Promise<void> {
  await write(key, value)
}

export { STORAGE_KEYS }

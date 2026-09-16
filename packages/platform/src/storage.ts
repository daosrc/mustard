import type { Settings } from '@mustard/shared'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@mustard/shared'
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
 * 内置提供商（OpenCode Zen）的模型列表以默认预设为准：补齐预设有、存储缺失的模型，
 * 并在 activeModel 失效时回退到默认，避免旧版本残留的占位模型名导致请求失败。
 */
export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(STORAGE_KEYS.settings)

  const providers = (stored?.providers ?? DEFAULT_SETTINGS.providers).map((provider) => {
    const preset = DEFAULT_SETTINGS.providers.find(p => p.id === provider.id && p.builtin)
    if (!preset)
      return provider
    const names = new Set(provider.models.map(m => m.name))
    return { ...provider, models: [...provider.models, ...preset.models.filter(m => !names.has(m.name))] }
  })

  const activeProvider = providers.find(p => p.id === (stored?.activeProviderId ?? DEFAULT_SETTINGS.activeProviderId))
  const activeModelValid = activeProvider?.models.some(m => m.name === (stored?.activeModel ?? DEFAULT_SETTINGS.activeModel))

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    providers,
    activeProviderId: activeProvider?.id ?? DEFAULT_SETTINGS.activeProviderId,
    activeModel: activeModelValid ? stored!.activeModel! : DEFAULT_SETTINGS.activeModel,
    features: { ...DEFAULT_SETTINGS.features, ...stored?.features },
    hover: { ...DEFAULT_SETTINGS.hover, ...stored?.hover },
    floatingBall: { ...DEFAULT_SETTINGS.floatingBall, ...stored?.floatingBall, tools: stored?.floatingBall?.tools ?? DEFAULT_SETTINGS.floatingBall.tools },
    vocab: { ...DEFAULT_SETTINGS.vocab, ...stored?.vocab },
    dictionaries: { ...DEFAULT_SETTINGS.dictionaries, ...stored?.dictionaries },
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

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

/** 读取设置（与默认值合并，保证新增字段可用） */
export async function getSettings(): Promise<Settings> {
  const stored = await read<Partial<Settings>>(STORAGE_KEYS.settings)
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
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

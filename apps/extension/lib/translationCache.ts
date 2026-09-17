import type { TranslateResult } from '@mustard/core/translation'
import { idbGet, idbSet } from '@mustard/platform'

// 版本号：翻译链路/词典策略变更时递增，避免命中旧逻辑写入的缓存
const KEY = 'translate-cache-v2'
const MAX = 300

type CacheStore = Record<string, TranslateResult>

/** 可持久化的翻译缓存（background 重启后仍生效；超过上限按插入顺序淘汰） */
export async function getCached(key: string): Promise<TranslateResult | undefined> {
  const store = (await idbGet<CacheStore>(KEY)) ?? {}
  return store[key]
}

export async function setCached(key: string, value: TranslateResult): Promise<void> {
  const store = (await idbGet<CacheStore>(KEY)) ?? {}
  store[key] = value
  const keys = Object.keys(store)
  if (keys.length > MAX) {
    for (const stale of keys.slice(0, keys.length - MAX))
      delete store[stale]
  }
  await idbSet(KEY, store)
}

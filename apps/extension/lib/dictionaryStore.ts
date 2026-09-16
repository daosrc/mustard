import type { LocalEntry } from '@mustard/core/dictionary'
import type { DictResult } from '@mustard/shared'
import { createLocalLookup, ECDICT_SAMPLE } from '@mustard/core/dictionary'
import { idbGet, idbSet } from '@mustard/platform'

const KEY_PREFIX = 'dict:'

/** 内置词典数据（随扩展分发） */
export const BUILTIN_SOURCES: Record<string, LocalEntry[]> = {
  ecdict: ECDICT_SAMPLE,
}

/**
 * 可下载词典的数据源 URL。
 * 目前均为空（真实词典数据体积大、需人工裁剪，见 docs/PROBLEMS.md「离线词典数据源」）。
 */
export const DICT_SOURCES: Record<string, string | undefined> = {
  'wordnet': undefined,
  'cc-cedict': undefined,
  'jmdict': undefined,
  'freedict': undefined,
}

export function dictHasSource(id: string): boolean {
  return !!BUILTIN_SOURCES[id] || !!DICT_SOURCES[id]
}

async function getEntries(id: string): Promise<LocalEntry[]> {
  const builtin = BUILTIN_SOURCES[id]
  if (builtin)
    return builtin
  return (await idbGet<LocalEntry[]>(KEY_PREFIX + id)) ?? []
}

/** 下载并写入 IndexedDB（无数据源时抛 NO_SOURCE） */
export async function installDictionary(id: string): Promise<void> {
  const source = DICT_SOURCES[id]
  if (!source)
    throw new Error('NO_SOURCE')
  const res = await fetch(source)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  const entries = await res.json() as LocalEntry[]
  await idbSet(KEY_PREFIX + id, entries)
}

export async function uninstallDictionary(id: string): Promise<void> {
  await idbSet(KEY_PREFIX + id, [])
}

/** 按已启用词典构造本地查询函数（合并词条） */
export async function getLocalLookup(enabledIds: string[]): Promise<(word: string) => DictResult | null> {
  const entries: LocalEntry[] = []
  for (const id of enabledIds)
    entries.push(...await getEntries(id))
  return createLocalLookup(entries)
}

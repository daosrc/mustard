import type { DictionaryItem, DictionaryState, LangCode } from './types'
import { DICTIONARIES } from './constants'

/**
 * 该词典是否有可下载的数据源。
 * 没有数据源的条目（CC-CEDICT / JMdict / FreeDict）目前只能靠 AI 翻译，
 * 设置页会以「暂不支持」呈现，且不提供开关与下载按钮。
 */
export function isDictAvailable(dict: DictionaryItem): boolean {
  return !!dict.format && (!!dict.url || !!dict.perLetter)
}

/** 可用的离线词典（有数据源） */
export const AVAILABLE_DICTS: DictionaryItem[] = DICTIONARIES.filter(isDictAvailable)

/** 当前已启用的离线词典覆盖到的目标语言 */
export function offlineTargetLangs(dictionaries: DictionaryState): LangCode[] {
  const langs = new Set<LangCode>()
  for (const dict of AVAILABLE_DICTS) {
    if (dict.targetLang && dictionaries[dict.id]?.enabled)
      langs.add(dict.targetLang as LangCode)
  }
  return [...langs]
}

/** 目标语言是否有离线词典可用（false 表示只能走 AI） */
export function hasOfflineDictFor(dictionaries: DictionaryState, targetLang: LangCode): boolean {
  return offlineTargetLangs(dictionaries).includes(targetLang)
}

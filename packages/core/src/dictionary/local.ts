import type { DictResult } from '@mustard/shared'

export interface LocalEntry {
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
}

/** 轻量词形还原候选（不做完整 NLP；完整词典的 exchange/lemma 可在数据侧预处理） */
export function lemmaCandidates(raw: string): string[] {
  const word = raw.trim().toLowerCase()
  if (!word)
    return []
  const out = new Set<string>([word])
  const add = (value: string): void => {
    if (value.length >= 2)
      out.add(value)
  }
  if (word.endsWith('ies'))
    add(`${word.slice(0, -3)}y`)
  if (word.endsWith('es'))
    add(word.slice(0, -2))
  if (word.endsWith('s') && !word.endsWith('ss'))
    add(word.slice(0, -1))
  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3)
    add(stem)
    if (stem.length >= 3)
      add(`${stem}e`)
    if (stem.length >= 2 && stem[stem.length - 1] === stem[stem.length - 2])
      add(stem.slice(0, -1))
  }
  if (word.endsWith('ed')) {
    const stem = word.slice(0, -2)
    add(stem)
    if (stem.length >= 3)
      add(`${stem}e`)
  }
  if (word.endsWith('er'))
    add(word.slice(0, -2))
  if (word.endsWith('est'))
    add(word.slice(0, -3))
  return [...out]
}

/** 用一组词条构造本地查询函数（多词典可合并词条后共用） */
export function createLocalLookup(entries: LocalEntry[]): (word: string) => DictResult | null {
  const index = new Map<string, LocalEntry>()
  for (const entry of entries)
    index.set(entry.word.trim().toLowerCase(), entry)

  return (word: string): DictResult | null => {
    for (const candidate of lemmaCandidates(word)) {
      const hit = index.get(candidate)
      if (hit) {
        return {
          word: hit.word,
          phonetic: hit.phonetic,
          partOfSpeech: hit.partOfSpeech,
          translation: hit.translation,
          examples: hit.examples,
          source: 'local',
        }
      }
    }
    return null
  }
}

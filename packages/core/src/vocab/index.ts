import type { LangCode, Streak, WordEntry } from '@mustard/shared'
import { MASTERED_STREAK } from '@mustard/shared'
import { uid } from '@mustard/utils'

/** 归一化词头：去首尾标点、转小写（保留连字符与内部撇号） */
export function normalizeWord(raw: string): string {
  return raw.trim().toLowerCase().replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, '')
}

/** 去重键：同词 + 同源语言 */
export function wordKey(entry: Pick<WordEntry, 'word' | 'sourceLang'>): string {
  return `${entry.word.trim().toLowerCase()}|${entry.sourceLang}`
}

/** 新增或更新（保留原 id/createdAt，streak 取较大值） */
export function upsertWord(entries: WordEntry[], entry: WordEntry): WordEntry[] {
  const key = wordKey(entry)
  const index = entries.findIndex(e => wordKey(e) === key)
  if (index < 0)
    return [entry, ...entries]

  const prev = entries[index]!
  const merged: WordEntry = {
    ...prev,
    ...entry,
    id: prev.id,
    createdAt: prev.createdAt,
    updatedAt: Date.now(),
    streak: Math.max(prev.streak, entry.streak) as Streak,
  }
  const next = [...entries]
  next[index] = merged
  return next
}

export function removeWord(entries: WordEntry[], id: string): WordEntry[] {
  return entries.filter(e => e.id !== id)
}

/** 合并导入：同词同源语言保留 updatedAt 较新者；返回新增/更新数量 */
export function mergeVocab(
  existing: WordEntry[],
  incoming: Array<Partial<WordEntry>>,
): { entries: WordEntry[], imported: number } {
  const entries = [...existing]
  let imported = 0

  for (const raw of incoming) {
    const word = normalizeWord(raw.word ?? '')
    if (!word || !raw.translation)
      continue

    const now = Date.now()
    const createdAt = raw.createdAt ?? now
    const entry: WordEntry = {
      id: raw.id ?? uid('w-'),
      word,
      phonetic: raw.phonetic,
      partOfSpeech: raw.partOfSpeech,
      translation: raw.translation,
      examples: raw.examples,
      sourceLang: (raw.sourceLang ?? 'en') as LangCode,
      targetLang: (raw.targetLang ?? 'zh-CN') as LangCode,
      sourceUrl: raw.sourceUrl,
      createdAt,
      updatedAt: raw.updatedAt ?? createdAt,
      streak: (raw.streak ?? 0) as Streak,
      note: raw.note,
      tags: raw.tags,
    }

    const key = wordKey(entry)
    const index = entries.findIndex(e => wordKey(e) === key)
    if (index < 0) {
      entries.unshift(entry)
      imported++
    }
    else if (entry.updatedAt > entries[index]!.updatedAt) {
      entries[index] = { ...entry, id: entries[index]!.id }
      imported++
    }
  }

  return { entries, imported }
}

export function vocabStats(entries: WordEntry[]): { total: number, mastered: number, learning: number } {
  const mastered = entries.filter(e => e.streak >= MASTERED_STREAK).length
  return { total: entries.length, mastered, learning: entries.length - mastered }
}

/** 由词条卡片构造生词本条目（内容侧自动收录用） */
export function cardToEntry(input: {
  word: string
  translation: string
  phonetic?: string
  partOfSpeech?: string
  examples?: string[]
  sourceLang: LangCode
  targetLang: LangCode
  sourceUrl?: string
  streak?: Streak
}): WordEntry {
  const now = Date.now()
  return {
    id: uid('w-'),
    word: normalizeWord(input.word) || input.word.trim(),
    phonetic: input.phonetic,
    partOfSpeech: input.partOfSpeech,
    translation: input.translation,
    examples: input.examples,
    sourceLang: input.sourceLang,
    targetLang: input.targetLang,
    sourceUrl: input.sourceUrl,
    createdAt: now,
    updatedAt: now,
    streak: input.streak ?? 0,
  }
}

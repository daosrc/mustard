import type { WordEntry } from '@mustard/shared'
import { mergeVocab, removeWord, upsertWord } from '@mustard/core'
import { getStored, setStored, STORAGE_KEYS } from '@mustard/platform'

export async function getVocab(): Promise<WordEntry[]> {
  return (await getStored<WordEntry[]>(STORAGE_KEYS.vocab)) ?? []
}

async function saveVocab(entries: WordEntry[]): Promise<void> {
  await setStored(STORAGE_KEYS.vocab, entries)
}

/** 新增/更新词条（同名同源语言去重） */
export async function addVocab(entry: WordEntry): Promise<WordEntry> {
  const entries = upsertWord(await getVocab(), entry)
  await saveVocab(entries)
  return entries.find(e => e.word === entry.word && e.sourceLang === entry.sourceLang) ?? entry
}

export async function removeVocabById(id: string): Promise<void> {
  await saveVocab(removeWord(await getVocab(), id))
}

export async function importVocab(incoming: Array<Partial<WordEntry>>): Promise<{ imported: number, total: number }> {
  const { entries, imported } = mergeVocab(await getVocab(), incoming)
  await saveVocab(entries)
  return { imported, total: entries.length }
}

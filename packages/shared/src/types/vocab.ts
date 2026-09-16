import type { LangCode } from './lang'

/** 熟悉度：连续答对次数，达到 3 即「已掌握」（答错清零） */
export type Streak = 0 | 1 | 2 | 3

export const MASTERED_STREAK: Streak = 3

export interface WordEntry {
  id: string
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
  sourceLang: LangCode
  targetLang: LangCode
  sourceUrl?: string
  createdAt: number
  updatedAt: number
  /** 连续答对次数 */
  streak: Streak
  note?: string
  tags?: string[]
}

export function isMastered(entry: Pick<WordEntry, 'streak'>): boolean {
  return entry.streak >= MASTERED_STREAK
}

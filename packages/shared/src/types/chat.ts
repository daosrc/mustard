import type { DictionaryItem, Settings } from './settings'
import type { WordEntry } from './vocab'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface Attachment {
  type: 'image' | 'file'
  name: string
  /** 图片：dataURL；文件：抽取出的文本（可空） */
  dataUrl?: string
  text?: string
  mime?: string
  size?: number
}

export interface TranslationCard {
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
  entry?: WordEntry
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  attachments?: Attachment[]
  card?: TranslationCard
  status?: 'loading' | 'streaming' | 'done' | 'error'
  createdAt: number
}

export interface Session {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** 词典查询结果（本地/在线统一结构） */
export interface DictResult {
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
  /** 来源：本地词典 id 或 online */
  source: string
}

export type TranslateMode = 'word' | 'sentence' | 'page'

export interface TranslateRequest {
  text: string
  sourceLang: Settings['sourceLang']
  targetLang: Settings['targetLang']
  mode: TranslateMode
}

export interface DictionaryStatus extends DictionaryItem {}

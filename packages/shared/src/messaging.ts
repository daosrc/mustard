import type { Attachment, ChatMessage, DictResult, LangCode, Session, Settings, SourceLang, TranslateMode, WordEntry } from './types'

/** content / sidepanel ⇄ background 的消息协议 */
export type Message
  = | { type: 'PING' }
    | { type: 'GET_SETTINGS' }
    | { type: 'UPDATE_SETTINGS', payload: Partial<Settings> }
    | { type: 'TRANSLATE_TEXT', payload: { text: string, sourceLang: SourceLang, targetLang: LangCode, mode: TranslateMode } }
    | { type: 'CHAT', payload: { messages: ChatMessage[], providerId: string, model: string, attachments?: Attachment[] } }
    | { type: 'TRANSLATE_IMAGE', payload: { dataUrl: string, targetLang: LangCode } }
    | { type: 'LOOKUP_WORD', payload: { word: string, sourceLang: SourceLang, targetLang: LangCode } }
    | { type: 'ADD_VOCAB', payload: WordEntry }
    | { type: 'GET_VOCAB' }
    | { type: 'REMOVE_VOCAB', payload: { id: string } }
    | { type: 'EXPORT_VOCAB', payload: { format: 'json' | 'csv' } }
    | { type: 'IMPORT_VOCAB', payload: { format: 'json' | 'csv', data: string } }
    | { type: 'GET_SESSIONS' }
    | { type: 'SAVE_SESSION', payload: { session: Session } }
    | { type: 'DELETE_SESSION', payload: { id: string } }
    | { type: 'OPEN_SIDEBAR', payload?: { view?: 'chat' | 'settings' | 'vocab' | 'history' } }
    | { type: 'CAPTURE_TAB' }

export type MessageType = Message['type']

export interface ResponseMap {
  PING: { ok: true }
  GET_SETTINGS: Settings
  UPDATE_SETTINGS: Settings
  TRANSLATE_TEXT: { text: string, card?: DictResult }
  CHAT: { content: string }
  TRANSLATE_IMAGE: { content: string }
  LOOKUP_WORD: DictResult | null
  ADD_VOCAB: WordEntry
  GET_VOCAB: WordEntry[]
  REMOVE_VOCAB: { id: string }
  EXPORT_VOCAB: { data: string, filename: string }
  IMPORT_VOCAB: { imported: number, total: number }
  GET_SESSIONS: Session[]
  SAVE_SESSION: Session
  DELETE_SESSION: { id: string }
  OPEN_SIDEBAR: { ok: true }
  CAPTURE_TAB: { dataUrl: string }
}

export type ResponseOf<T extends MessageType> = ResponseMap[T]

import type { Attachment, ChatMessage, DictInstallStatus, DictResult, LangCode, PageContent, Session, Settings, SourceLang, TranslateMode, WordEntry } from './types'

/** content / sidepanel ⇄ background 的消息协议 */
export type Message
  = | { type: 'PING' }
    | { type: 'GET_SETTINGS' }
    | { type: 'UPDATE_SETTINGS', payload: Partial<Settings> }
    | { type: 'TRANSLATE_TEXT', payload: { text: string, sourceLang: SourceLang, targetLang: LangCode, mode: TranslateMode, preferAi?: boolean, dictionaryOnly?: boolean } }
    | { type: 'TRANSLATE_BLOCKS', payload: { texts: string[], sourceLang: SourceLang, targetLang: LangCode } }
    | { type: 'CHAT', payload: { messages: ChatMessage[], providerId: string, model: string, attachments?: Attachment[] } }
    | { type: 'TRANSLATE_IMAGE', payload: { dataUrl: string, targetLang: LangCode } }
    | { type: 'LOOKUP_WORD', payload: { word: string, sourceLang: SourceLang, targetLang: LangCode } }
    | { type: 'ADD_VOCAB', payload: WordEntry }
    | { type: 'UPDATE_VOCAB', payload: WordEntry }
    | { type: 'GET_VOCAB' }
    | { type: 'REMOVE_VOCAB', payload: { id: string } }
    | { type: 'EXPORT_VOCAB', payload: { format: 'json' | 'csv' } }
    | { type: 'IMPORT_VOCAB', payload: { format: 'json' | 'csv', data: string } }
    | { type: 'GET_DICT_STATUS' }
    | { type: 'DICT_INSTALL', payload: { id: string } }
    | { type: 'DICT_REMOVE', payload: { id: string } }
    | { type: 'GET_SESSIONS' }
    | { type: 'SAVE_SESSION', payload: { session: Session } }
    | { type: 'DELETE_SESSION', payload: { id: string } }
    | { type: 'OPEN_SIDEBAR', payload?: { view?: 'chat' | 'settings' | 'vocab' | 'history' | 'summary', summary?: PageContent } }
    | { type: 'CAPTURE_TAB' }
    // 网页翻译按标签页独立：内容脚本请求「本标签页」开/关，后台只广播回该标签页的所有 frame
    | { type: 'PAGE_TRANSLATE_SET', payload: { on: boolean } }
    // 内容脚本加载后询问本标签页的网页翻译开关（同标签内跳转 / 刷新后恢复）
    | { type: 'PAGE_TRANSLATE_GET' }
    // 后台 → 某标签页所有 frame：设置该 frame 的网页翻译开关
    | { type: 'PAGE_TRANSLATE', payload: { on: boolean } }
    // 后台 → 活动标签页顶层 frame：快捷键切换（由顶层 frame 决定开/关后再请求广播）
    | { type: 'PAGE_TRANSLATE_TOGGLE' }

export type MessageType = Message['type']

export interface ResponseMap {
  PING: { ok: true }
  GET_SETTINGS: Settings
  UPDATE_SETTINGS: Settings
  TRANSLATE_TEXT: { text: string, card?: DictResult }
  TRANSLATE_BLOCKS: { texts: string[] }
  CHAT: { content: string }
  TRANSLATE_IMAGE: { content: string }
  LOOKUP_WORD: DictResult | null
  ADD_VOCAB: WordEntry
  UPDATE_VOCAB: WordEntry
  GET_VOCAB: WordEntry[]
  REMOVE_VOCAB: { id: string }
  EXPORT_VOCAB: { data: string, filename: string }
  IMPORT_VOCAB: { imported: number, total: number }
  GET_DICT_STATUS: DictInstallStatus[]
  DICT_INSTALL: { id: string, ok: boolean, error?: string }
  DICT_REMOVE: { id: string }
  GET_SESSIONS: Session[]
  SAVE_SESSION: Session
  DELETE_SESSION: { id: string }
  OPEN_SIDEBAR: { ok: true }
  CAPTURE_TAB: { dataUrl: string }
  PAGE_TRANSLATE_SET: { ok: true }
  PAGE_TRANSLATE_GET: { on: boolean }
  PAGE_TRANSLATE: { ok: true }
  PAGE_TRANSLATE_TOGGLE: { ok: true }
}

export type ResponseOf<T extends MessageType> = ResponseMap[T]

import type { Attachment, ChatMessage } from './types'

/** 流式对话使用的长连接端口名（sidepanel ⇄ background） */
export const CHAT_PORT_NAME = 'mustard-chat'

export interface ChatStartPayload {
  messages: ChatMessage[]
  providerId: string
  model: string
  attachments?: Attachment[]
}

/** sidepanel → background */
export type ChatPortClientMessage
  = | { type: 'CHAT_START', payload: ChatStartPayload }
    | { type: 'CHAT_ABORT' }

/** background → sidepanel */
export type ChatPortServerMessage
  = | { type: 'CHAT_DELTA', delta: string }
    | { type: 'CHAT_DONE', content: string }
    | { type: 'CHAT_ERROR', code: string, message: string }

/** 未配置 API Key（前端据此引导去设置页） */
export const ERR_MISSING_API_KEY = 'MISSING_API_KEY'

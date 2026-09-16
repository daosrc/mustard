import type { ChatMessage, Session } from '@mustard/shared'
import { uid } from '@mustard/utils'

export function createSession(): Session {
  const now = Date.now()
  return { id: uid('s-'), title: '新会话', messages: [], createdAt: now, updatedAt: now }
}

/** 标题取首条用户消息（截断） */
export function sessionTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === 'user' && m.content.trim())
  const title = first?.content.trim().replace(/\s+/g, ' ').slice(0, 24)
  return title || '新会话'
}

export function upsertSession(sessions: Session[], session: Session): Session[] {
  const index = sessions.findIndex(s => s.id === session.id)
  if (index < 0)
    return [session, ...sessions]
  const next = [...sessions]
  next[index] = session
  return next
}

export function removeSession(sessions: Session[], id: string): Session[] {
  return sessions.filter(s => s.id !== id)
}

export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)
}

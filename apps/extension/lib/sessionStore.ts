import type { Session } from '@mustard/shared'
import { removeSession, upsertSession } from '@mustard/core/session'
import { idbGet, idbSet } from '@mustard/platform'

const KEY = 'sessions'

export async function getSessions(): Promise<Session[]> {
  return (await idbGet<Session[]>(KEY)) ?? []
}

export async function saveSession(session: Session): Promise<Session> {
  await idbSet(KEY, upsertSession(await getSessions(), session))
  return session
}

export async function deleteSession(id: string): Promise<void> {
  await idbSet(KEY, removeSession(await getSessions(), id))
}

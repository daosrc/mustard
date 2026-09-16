import type { ChatPortClientMessage, ChatPortServerMessage, ChatStartPayload } from '@mustard/shared'
import { CHAT_PORT_NAME } from '@mustard/shared'
import { browser } from 'wxt/browser'

export interface ChatStreamHandlers {
  onDelta?: (delta: string) => void
  onDone?: (content: string) => void
  onError?: (code: string, message: string) => void
}

export interface ChatStreamHandle {
  abort: () => void
}

/** 打开一条流式对话长连接；返回句柄用于中止 */
export function startChat(payload: ChatStartPayload, handlers: ChatStreamHandlers): ChatStreamHandle {
  const port = browser.runtime.connect({ name: CHAT_PORT_NAME })
  let content = ''
  let finished = false

  function settle(fn: () => void): void {
    if (finished)
      return
    finished = true
    try {
      fn()
    }
    finally {
      port.disconnect()
    }
  }

  port.onMessage.addListener((raw) => {
    const msg = raw as ChatPortServerMessage
    if (msg.type === 'CHAT_DELTA') {
      content += msg.delta
      handlers.onDelta?.(msg.delta)
    }
    else if (msg.type === 'CHAT_DONE') {
      settle(() => handlers.onDone?.(msg.content || content))
    }
    else {
      settle(() => handlers.onError?.(msg.code, msg.message))
    }
  })

  port.onDisconnect.addListener(() => settle(() => handlers.onDone?.(content)))

  port.postMessage({ type: 'CHAT_START', payload } satisfies ChatPortClientMessage)

  return {
    abort() {
      if (finished)
        return
      finished = true
      try {
        port.postMessage({ type: 'CHAT_ABORT' } satisfies ChatPortClientMessage)
      }
      catch {
        // 端口已断开时忽略
      }
      port.disconnect()
    },
  }
}

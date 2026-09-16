import type { Message, MessageType, ResponseOf } from '@mustard/shared'
import { browser } from 'wxt/browser'

/** 发送消息到 background（类型安全） */
export async function send<T extends MessageType>(message: Extract<Message, { type: T }>): Promise<ResponseOf<T>> {
  return await browser.runtime.sendMessage(message) as ResponseOf<T>
}

/** 监听消息（background 侧） */
export function onMessage(
  handler: (message: Message, sender: unknown) => unknown | Promise<unknown>,
): void {
  browser.runtime.onMessage.addListener((message, sender) => {
    return handler(message as Message, sender) as any
  })
}

/** 打开侧边栏（尽量在用户手势上下文中调用；失败时静默） */
export async function openSidePanel(tabId?: number): Promise<void> {
  const anyBrowser = browser as any
  if (!anyBrowser.sidePanel?.open)
    return
  try {
    if (typeof tabId === 'number') {
      await anyBrowser.sidePanel.open({ tabId })
      return
    }
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (tab?.windowId !== undefined)
      await anyBrowser.sidePanel.open({ windowId: tab.windowId })
  }
  catch {
    // 忽略：无权限或无活动标签时静默失败
  }
}

export { browser }

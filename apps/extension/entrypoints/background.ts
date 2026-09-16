import type { ChatPortClientMessage, Message } from '@mustard/shared'
import { chatOnce, chatStream, errorCode } from '@mustard/core'
import { getSettings, openSidePanel, updateSettings } from '@mustard/platform'
import { CHAT_PORT_NAME, ERR_MISSING_API_KEY } from '@mustard/shared'
import { browser } from 'wxt/browser'
import { defineBackground } from '#imports'

export default defineBackground({
  type: 'module',
  main() {
    // 点击工具栏图标时打开侧边栏
    ;(browser as any).sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(() => {})

    browser.runtime.onMessage.addListener((raw, sender) => {
      const message = raw as Message
      switch (message.type) {
        case 'PING':
          return Promise.resolve({ ok: true })
        case 'GET_SETTINGS':
          return getSettings()
        case 'UPDATE_SETTINGS':
          return updateSettings(message.payload)
        case 'OPEN_SIDEBAR':
          return openSidePanel((sender as any)?.tab?.id).then(() => ({ ok: true }))
        case 'CHAT': {
          const { messages, providerId, model } = message.payload
          return (async () => {
            const settings = await getSettings()
            const provider = settings.providers.find(p => p.id === providerId)
            const modelDef = provider?.models.find(m => m.name === model)
            if (!provider || !modelDef)
              throw new Error('MODEL_NOT_FOUND')
            return { content: await chatOnce(provider, modelDef, messages) }
          })()
        }
        default:
          return Promise.resolve(null)
      }
    })

    // 流式对话：长连接端口
    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== CHAT_PORT_NAME)
        return
      let controller: AbortController | null = null

      port.onMessage.addListener((raw) => {
        const message = raw as ChatPortClientMessage
        if (message.type === 'CHAT_ABORT') {
          controller?.abort()
          return
        }
        if (message.type !== 'CHAT_START')
          return

        const { messages, providerId, model } = message.payload
        void (async () => {
          const settings = await getSettings()
          const provider = settings.providers.find(p => p.id === providerId)
          const modelDef = provider?.models.find(m => m.name === model)
          if (!provider || !modelDef) {
            port.postMessage({ type: 'CHAT_ERROR', code: 'MODEL_NOT_FOUND', message: '未找到所选模型' })
            return
          }
          if (!provider.apiKey) {
            port.postMessage({ type: 'CHAT_ERROR', code: ERR_MISSING_API_KEY, message: '尚未配置 API Key' })
            return
          }
          controller = new AbortController()
          let content = ''
          try {
            for await (const chunk of chatStream(provider, modelDef, messages, controller.signal)) {
              content += chunk.delta
              port.postMessage({ type: 'CHAT_DELTA', delta: chunk.delta })
            }
            port.postMessage({ type: 'CHAT_DONE', content })
          }
          catch (error) {
            port.postMessage({ type: 'CHAT_ERROR', code: errorCode(error), message: errorCode(error) })
          }
        })()
      })

      port.onDisconnect.addListener(() => controller?.abort())
    })
  },
})

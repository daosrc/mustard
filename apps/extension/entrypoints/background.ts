import type { Message } from '@mustard/shared'
import { getSettings, openSidePanel, updateSettings } from '@mustard/platform'
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
        default:
          return Promise.resolve(null)
      }
    })
  },
})

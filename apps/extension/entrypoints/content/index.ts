import { createApp } from 'vue'
import { createShadowRootUi, defineContentScript } from '#imports'
import ContentApp from './ContentApp.vue'
import '@mustard/design-tokens/theme.css'
import './content.css'
import 'virtual:uno.css'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  allFrames: true,
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'mustard-root',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const app = createApp(ContentApp)
        app.mount(container)
        return app
      },
      onRemove(app) {
        app?.unmount()
      },
    })
    ui.mount()
  },
})

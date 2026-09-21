import UnoCSS from 'unocss/vite'
import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [UnoCSS()],
  }),
  zip: {
    artifactTemplate: 'mustard-translate-{{packageVersion}}-{{browser}}.zip',
  },
  manifest: {
    name: 'Mustard 芥末',
    description: '开源 Chrome 划词/悬浮/网页翻译扩展：AI 对话、生词本与记词、离线词典。',
    permissions: [
      'storage',
      'sidePanel',
      'scripting',
      'contextMenus',
      'activeTab',
      'tabs',
    ],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Mustard 芥末',
    },
    commands: {
      'toggle-page-translate': {
        suggested_key: { default: 'Alt+T' },
        description: '切换网页翻译',
      },
      'open-sidebar': {
        suggested_key: { default: 'Alt+L' },
        description: '打开 Mustard 侧边栏',
      },
    },
  },
})

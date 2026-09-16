import UnoCSS from '@unocss/astro'
import { defineConfig } from 'astro/config'

// GitHub Pages：仓库 daosrc/mustard → https://daosrc.github.io/mustard/
export default defineConfig({
  site: 'https://daosrc.github.io',
  base: '/mustard',
  integrations: [UnoCSS({ injectReset: true })],
})

import { presetMustard } from '@mustard/design-tokens'
import { defineConfig } from 'unocss'

export default defineConfig({
  presets: presetMustard(),
  shortcuts: {
    'btn': 'inline-flex items-center gap-2 px-4 py-2 rounded-md font-600 text-sm no-underline transition',
    'btn-primary': 'btn bg-primary text-primary-ink hover:opacity-90',
    'btn-ghost': 'btn bg-surface-2 text-ink border border-line hover:border-primary',
    'card': 'bg-surface border border-line rounded-lg p-5',
    'chip': 'inline-block text-xs px-2 py-1 rounded-md bg-primary-soft text-primary font-600',
  },
})

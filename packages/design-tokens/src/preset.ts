import type { Preset } from 'unocss'
import { presetWind3 } from 'unocss'

/**
 * Mustard 主题预设：颜色统一定义为 CSS 变量，深浅色通过切换变量实现，
 * 因此扩展与宣传页共用同一套 token。
 */
export function presetMustard(): Preset[] {
  return [
    presetWind3(),
    {
      name: 'mustard-theme',
      theme: {
        colors: {
          'paper': 'var(--m-paper)',
          'surface': 'var(--m-surface)',
          'surface-2': 'var(--m-surface-2)',
          'ink': 'var(--m-ink)',
          'muted': 'var(--m-muted)',
          'faint': 'var(--m-faint)',
          'line': 'var(--m-line)',
          'blush': 'var(--m-blush)',
          'warn': 'var(--m-warn)',
          'primary': {
            DEFAULT: 'var(--m-primary)',
            ink: 'var(--m-primary-ink)',
            soft: 'var(--m-primary-soft)',
          },
          'accent': {
            DEFAULT: 'var(--m-accent)',
            soft: 'var(--m-accent-soft)',
          },
        },
        borderRadius: {
          sm: '8px',
          md: '12px',
          lg: '16px',
        },
      },
    },
  ]
}

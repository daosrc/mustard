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
        boxShadow: {
          sm: 'var(--m-shadow-sm)',
          md: 'var(--m-shadow-md)',
          lg: 'var(--m-shadow-lg)',
        },
      },
      shortcuts: [
        ['m-card', 'bg-surface border border-line rounded-md'],
        ['m-panel', 'bg-surface border border-line rounded-lg'],
        ['m-row', 'flex items-center justify-between gap-3'],
        ['m-col', 'flex flex-col gap-3'],
        ['m-chip', 'inline-flex items-center gap-1 text-[11px] leading-none text-muted bg-surface-2 border border-line px-2 py-1 rounded-sm'],
        ['m-input', 'w-full bg-surface-2 text-ink border border-line rounded-[9px] px-[11px] py-[9px] text-[13px] leading-5 outline-none transition focus:bg-surface focus:border-primary focus:shadow-[0_0_0_3px_var(--m-primary-soft)]'],
        ['m-icon-btn', 'inline-flex items-center justify-center w-7 h-7 rounded-sm text-muted cursor-pointer transition hover:text-ink hover:bg-surface-2'],
        ['m-muted', 'text-muted text-[12px] leading-relaxed'],
      ],
    },
  ]
}

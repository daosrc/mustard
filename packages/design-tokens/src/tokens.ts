/**
 * 芥末绿设计 token。
 * 颜色以 CSS 变量形式暴露（见 theme.css），并在深浅色之间切换。
 */

export const tokenVars = {
  paper: '--m-paper',
  surface: '--m-surface',
  surface2: '--m-surface-2',
  ink: '--m-ink',
  muted: '--m-muted',
  faint: '--m-faint',
  line: '--m-line',
  primary: '--m-primary',
  primarySoft: '--m-primary-soft',
  accent: '--m-accent',
  accentSoft: '--m-accent-soft',
  blush: '--m-blush',
  warn: '--m-warn',
  primaryInk: '--m-primary-ink',
  shadowSm: '--m-shadow-sm',
  shadowMd: '--m-shadow-md',
  shadowLg: '--m-shadow-lg',
} as const

export type TokenName = keyof typeof tokenVars

export const lightTokens: Record<string, string> = {
  '--m-paper': '#F3FAEC',
  '--m-surface': '#FFFFFF',
  '--m-surface-2': '#EBF5E1',
  '--m-ink': '#25331C',
  '--m-muted': '#6C7C5F',
  '--m-faint': '#9CB08C',
  '--m-line': '#DBE9CD',
  '--m-primary': '#7ABE3E',
  '--m-primary-ink': '#FFFFFF',
  '--m-primary-soft': '#E8F6D9',
  '--m-accent': '#66B23A',
  '--m-accent-soft': '#E6F5D8',
  '--m-blush': '#F3A3B8',
  '--m-warn': '#E0A63A',
  '--m-shadow-sm': '0 2px 10px rgba(45,75,28,.07)',
  '--m-shadow-md': '0 8px 26px rgba(45,75,28,.11)',
  '--m-shadow-lg': '0 18px 50px rgba(45,75,28,.16)',
}

export const darkTokens: Record<string, string> = {
  '--m-paper': '#171E13',
  '--m-surface': '#1F2A19',
  '--m-surface-2': '#2A3622',
  '--m-ink': '#E9F2E0',
  '--m-muted': '#9DB08E',
  '--m-faint': '#6E8060',
  '--m-line': '#33422A',
  '--m-primary': '#8FCF4A',
  '--m-primary-ink': '#12200A',
  '--m-primary-soft': '#2B3A20',
  '--m-accent': '#7BC043',
  '--m-accent-soft': '#2B3A20',
  '--m-blush': '#E794AC',
  '--m-warn': '#E0A63A',
  '--m-shadow-sm': '0 2px 10px rgba(0,0,0,.35)',
  '--m-shadow-md': '0 8px 26px rgba(0,0,0,.45)',
  '--m-shadow-lg': '0 18px 50px rgba(0,0,0,.55)',
}

/** 品牌渐变（悬浮球/Logo 背景等） */
export const brandGradient = 'linear-gradient(135deg, var(--m-primary), #A8D96B)'

export const radii = { sm: '8px', md: '12px', lg: '16px' } as const

export const shadows = {
  sm: 'var(--m-shadow-sm)',
  md: 'var(--m-shadow-md)',
  lg: 'var(--m-shadow-lg)',
} as const

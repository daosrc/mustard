/**
 * 深色模式：将 `system | light | dark` 解析为实际主题，并写到目标元素的
 * `data-theme` 属性上（默认 documentElement）。CSS 变量见 theme.css。
 */

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_ATTR = 'data-theme'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

/** 当前系统是否为深色（无 window 时回退为浅色） */
export function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia)
    return false
  return window.matchMedia(DARK_QUERY).matches
}

export function resolveTheme(mode: ThemeMode, systemDark: boolean = prefersDark()): ResolvedTheme {
  if (mode === 'system')
    return systemDark ? 'dark' : 'light'
  return mode
}

/** 应用主题，返回解析后的实际主题 */
export function applyTheme(
  mode: ThemeMode,
  target: HTMLElement = document.documentElement,
): ResolvedTheme {
  const resolved = resolveTheme(mode)
  target.setAttribute(THEME_ATTR, resolved)
  return resolved
}

/** 监听系统深浅色变化，返回取消订阅函数 */
export function watchSystemTheme(cb: (dark: boolean) => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia)
    return () => {}
  const mq = window.matchMedia(DARK_QUERY)
  const handler = (event: MediaQueryListEvent): void => cb(event.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

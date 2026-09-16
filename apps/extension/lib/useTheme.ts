import type { ResolvedTheme, ThemeMode } from '@mustard/design-tokens/theme'
import type { Settings } from '@mustard/shared'
import type { Ref } from 'vue'
import { applyTheme, watchSystemTheme } from '@mustard/design-tokens/theme'
import { browser } from '@mustard/platform'
import { STORAGE_KEYS } from '@mustard/shared'
import { onBeforeUnmount, onMounted, ref } from 'vue'

type StorageChanges = Record<string, { newValue?: unknown }>

/**
 * 让 settings.theme（system/light/dark）生效：把解析后的主题写到目标元素的
 * `data-theme` 上。默认写 documentElement；content script 传入 Shadow DOM 内的
 * 根元素，避免污染宿主页面。会跟随系统主题与 storage 变更。
 */
export function useTheme(getTarget?: () => HTMLElement | null | undefined): {
  mode: Ref<ThemeMode>
  resolved: Ref<ResolvedTheme>
  apply: () => void
} {
  const mode = ref<ThemeMode>('system')
  const resolved = ref<ResolvedTheme>('light')

  function target(): HTMLElement | null {
    // 提供 getTarget 时不回退到 documentElement（content 侧避免污染宿主页面）
    if (getTarget)
      return getTarget() ?? null
    return typeof document === 'undefined' ? null : document.documentElement
  }

  function apply(): void {
    const el = target()
    if (el)
      resolved.value = applyTheme(mode.value, el)
  }

  let stopSystem: (() => void) | undefined

  function onStorage(changes: StorageChanges, areaName: string): void {
    if (areaName !== 'local' || !changes[STORAGE_KEYS.settings])
      return
    const next = (changes[STORAGE_KEYS.settings]!.newValue as Partial<Settings> | undefined)?.theme
    if (next && next !== mode.value) {
      mode.value = next
      apply()
    }
  }

  onMounted(async () => {
    apply()
    stopSystem = watchSystemTheme(() => {
      if (mode.value === 'system')
        apply()
    })
    browser.storage.onChanged.addListener(onStorage)
    try {
      const stored = await browser.storage.local.get(STORAGE_KEYS.settings)
      const theme = (stored[STORAGE_KEYS.settings] as Partial<Settings> | undefined)?.theme
      if (theme) {
        mode.value = theme
        apply()
      }
    }
    catch {
      // 读取失败时保持跟随系统
    }
  })

  onBeforeUnmount(() => {
    stopSystem?.()
    browser.storage.onChanged.removeListener(onStorage)
  })

  return { mode, resolved, apply }
}

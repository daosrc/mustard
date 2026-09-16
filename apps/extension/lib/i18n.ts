import type { UILang } from '@mustard/shared'
import type { ComputedRef } from 'vue'
import { t as translate } from '@mustard/shared'
import { computed } from 'vue'
import { useSettingsStore } from '../stores/settings'

/** 扩展界面文案：跟随 settings.uiLang（默认中文） */
export function useI18n(): {
  lang: ComputedRef<UILang>
  t: (key: string, vars?: Record<string, string | number>) => string
} {
  const store = useSettingsStore()
  const lang = computed<UILang>(() => store.settings?.uiLang ?? 'zh')
  const t = (key: string, vars?: Record<string, string | number>): string => translate(lang.value, key, vars)
  return { lang, t }
}

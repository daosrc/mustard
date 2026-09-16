import type { LangCode, LangOption, SourceLang } from './types/lang'

export const LANGS: LangOption[] = [
  { code: 'zh-CN', label: '简体中文', labelEn: 'Simplified Chinese', short: '中', bcp47: 'zh-CN' },
  { code: 'zh-TW', label: '繁體中文', labelEn: 'Traditional Chinese', short: '繁', bcp47: 'zh-TW' },
  { code: 'en', label: 'English', labelEn: 'English', short: 'EN', bcp47: 'en-US' },
  { code: 'ja', label: '日本語', labelEn: 'Japanese', short: '日', bcp47: 'ja-JP' },
  { code: 'ko', label: '한국어', labelEn: 'Korean', short: '한', bcp47: 'ko-KR' },
  { code: 'fr', label: 'Français', labelEn: 'French', short: 'FR', bcp47: 'fr-FR' },
  { code: 'de', label: 'Deutsch', labelEn: 'German', short: 'DE', bcp47: 'de-DE' },
  { code: 'es', label: 'Español', labelEn: 'Spanish', short: 'ES', bcp47: 'es-ES' },
  { code: 'ru', label: 'Русский', labelEn: 'Russian', short: 'RU', bcp47: 'ru-RU' },
  { code: 'pt', label: 'Português', labelEn: 'Portuguese', short: 'PT', bcp47: 'pt-PT' },
  { code: 'it', label: 'Italiano', labelEn: 'Italian', short: 'IT', bcp47: 'it-IT' },
  { code: 'ar', label: 'العربية', labelEn: 'Arabic', short: 'AR', bcp47: 'ar-SA' },
  { code: 'th', label: 'ไทย', labelEn: 'Thai', short: 'TH', bcp47: 'th-TH' },
  { code: 'vi', label: 'Tiếng Việt', labelEn: 'Vietnamese', short: 'VI', bcp47: 'vi-VN' },
]

export const DEFAULT_TARGET_LANG: LangCode = 'zh-CN'

export const SOURCE_LANGS: Array<{ code: SourceLang, label: string }> = [
  { code: 'auto', label: '自动检测' },
  ...LANGS.map(l => ({ code: l.code as SourceLang, label: l.label })),
]

export function langOption(code: LangCode): LangOption | undefined {
  return LANGS.find(l => l.code === code)
}

export function langShort(code: LangCode): string {
  return langOption(code)?.short ?? code.toUpperCase()
}

export function langBcp47(code: LangCode): string {
  return langOption(code)?.bcp47 ?? code
}

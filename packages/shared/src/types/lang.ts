/**
 * 语言代码：源语言支持 auto（自动检测），目标语言为具体语种。
 */
export type SourceLang = 'auto' | LangCode

export type LangCode
  = | 'zh-CN'
    | 'zh-TW'
    | 'en'
    | 'ja'
    | 'ko'
    | 'fr'
    | 'de'
    | 'es'
    | 'ru'
    | 'pt'
    | 'it'
    | 'ar'
    | 'th'
    | 'vi'

export interface LangOption {
  code: LangCode
  /** 中文名 */
  label: string
  /** 英文名 */
  labelEn: string
  /** 输入框中的简写（如 中 / EN / 日） */
  short: string
  /** Web Speech / Intl 使用的 BCP-47 标记 */
  bcp47: string
}

import type { LangCode, SourceLang } from './lang'
import type { Provider } from './provider'

export type ToolKind = 'toggle' | 'action'

export type ToolId
  = | 'pageTranslate'
    | 'selectionTranslate'
    | 'hoverTranslate'
    | 'vocab'
    | 'settings'
    | (string & {})

export interface ToolItem {
  id: ToolId
  label: string
  type: ToolKind
  visible: boolean
  order: number
}

export interface HoverSettings {
  /** 触发延迟（ms） */
  delay: number
  /** 取词范围 */
  scope: 'word' | 'sentence'
}

export interface FloatingBallSettings {
  enabled: boolean
  position: 'right' | 'left'
  expand: 'radial' | 'stack'
  tools: ToolItem[]
}

export interface FeatureSettings {
  pageTranslate: boolean
  selectionTranslate: boolean
  hoverTranslate: boolean
}

export interface VocabSettings {
  /** 翻译单词后自动收录 */
  autoAdd: boolean
  /** 仅收录单词（非整句） */
  wordOnly: boolean
}

export type ThemeMode = 'system' | 'light' | 'dark'

export interface DictionaryItem {
  id: string
  name: string
  langPair: string
  license: string
  size: string
  /** 内置 */
  builtin?: boolean
  /** 是否已安装（下载完成） */
  installed: boolean
  enabled: boolean
}

export type DictionaryState = Record<string, Pick<DictionaryItem, 'installed' | 'enabled'>>

export interface Settings {
  providers: Provider[]
  activeProviderId: string
  activeModel: string
  sourceLang: SourceLang
  targetLang: LangCode
  features: FeatureSettings
  hover: HoverSettings
  floatingBall: FloatingBallSettings
  vocab: VocabSettings
  theme: ThemeMode
  /** 在线词典兜底（本地词典未命中时联网查询） */
  onlineDictionaryFallback: boolean
  /** 离线词典安装/启用状态 */
  dictionaries: DictionaryState
}

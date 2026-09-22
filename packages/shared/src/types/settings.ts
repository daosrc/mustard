import type { UILang } from '../i18n'
import type { LangCode, SourceLang } from './lang'
import type { Provider } from './provider'

export type ToolKind = 'toggle' | 'action'

export type ToolId
  = | 'pageTranslate'
    | 'selectionTranslate'
    | 'hoverTranslate'
    | 'pageSummary'
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
  /** 竖直位置：球心距顶部的高度占视口高度的比例（0~1，拖拽后记录） */
  y?: number
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
  /** 内置（随扩展分发）——当前词典均首次使用时下载，故不带内置 */
  builtin?: boolean
  /** 是否已安装（下载完成） */
  installed: boolean
  enabled: boolean
  /** 下载格式与地址（首次使用时下载） */
  format?: 'ecdict-csv' | 'wordset-letters' | 'open-ecdict' | 'cedict-txt' | 'jmdict-xml' | 'freedict-tei'
  url?: string
  /** 数据为 gzip（浏览器用 DecompressionStream 解压） */
  gzip?: boolean
  /** 词条本身的语言（用于按脚本粗筛，避免用中文词典查英文单词） */
  sourceLang?: string
  /** 按字母懒加载（wordset） */
  perLetter?: boolean
  /** 该词典输出的目标语言（用于按目标语言筛选；缺省视为任意） */
  targetLang?: string
  /** 首次使用时自动下载并启用（英汉词典） */
  defaultInstall?: boolean
  /** 数据来源与署名 */
  attribution?: string
}

/** 词典下载/安装状态（设置页展示用） */
export interface DictInstallStatus {
  id: string
  installed: boolean
  enabled: boolean
  /** 0–1 进度；null 表示未在下载 */
  progress: number | null
  error?: string
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
  /** 扩展界面语言 */
  uiLang: UILang
  /** 在线词典兜底（本地词典未命中时联网查询） */
  onlineDictionaryFallback: boolean
  /** 离线词典安装/启用状态 */
  dictionaries: DictionaryState
}

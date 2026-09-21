import type { DictionaryItem, ModelDef, Provider, Settings, ToolItem } from './types'
import { DEFAULT_TARGET_LANG } from './langs'

/**
 * 构建期环境变量（Vite / WXT 注入）。这里只声明用到的字段，
 * 避免 shared 包依赖 vite 的类型；声明为全局以便各包 typecheck 时都能识别。
 */
declare global {
  interface ImportMetaEnv {
    DEV: boolean
    PROD: boolean
    MODE: string
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

/** chrome.storage.local 键名 */
export const STORAGE_KEYS = {
  settings: 'mustard:settings',
  vocab: 'mustard:vocab',
  sessions: 'mustard:sessions',
  cache: 'mustard:cache',
  /** 打开侧边栏时请求的初始视图（content → background → sidepanel） */
  pendingView: 'mustard:pending-view',
  /** 右键「翻译选中文本」待填入输入框的内容 */
  pendingCompose: 'mustard:pending-compose',
  /** 一次性 UI 提示（如首次使用自动下载词典完成），读取后即清除 */
  notice: 'mustard:notice',
} as const

/**
 * 是否注入内置提供商预设。
 * 发布构建（`wxt build`，即 release 用的产物）**不包含任何提供商信息**，
 * 用户需在设置页自行添加；开发时（`wxt dev`）保留预设便于调试。
 */
const WITH_PROVIDER_PRESETS = import.meta.env.DEV

/**
 * 默认模型提供商：OpenRouter（OpenAI 兼容，默认包含两个免费模型）。
 * 仅开发构建注入，见 `WITH_PROVIDER_PRESETS`。
 * baseUrl：`https://openrouter.ai/api/v1`；用户需在设置页填入自己的 API Key。
 * 免费模型走 OpenRouter 共享池，偶发 429 属正常，可切换其他免费模型。
 */
export const OPENROUTER_PRESET: Provider = {
  id: 'openrouter',
  name: 'OpenRouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  builtin: true,
  models: [
    // 默认：稳定免费文本模型
    {
      id: 'openrouter:nvidia/nemotron-3-super-120b-a12b:free',
      name: 'nvidia/nemotron-3-super-120b-a12b:free',
      inputs: { text: true, image: false, file: false },
    },
    // 多模态（图片输入）
    {
      id: 'openrouter:inclusionai/ling-3.0-flash-vl:free',
      name: 'inclusionai/ling-3.0-flash-vl:free',
      inputs: { text: true, image: true, file: false },
    },
    // 备用文本模型
    {
      id: 'openrouter:nvidia/nemotron-3-ultra-550b-a55b:free',
      name: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      inputs: { text: true, image: false, file: false },
    },
    // 备用文本模型（共享池偶发限流）
    {
      id: 'openrouter:z-ai/glm-5.2:free',
      name: 'z-ai/glm-5.2:free',
      inputs: { text: true, image: false, file: false },
    },
  ],
}

/**
 * Agnes AI（OpenAI 兼容）。
 * 仅开发构建注入，见 `WITH_PROVIDER_PRESETS`。
 * baseUrl：`https://apihub.agnes-ai.com/v1`；模型 `agnes-2.5-flash`（支持图像 URL 输入）。
 * 用户需在设置页填入自己的 API Key。
 */
export const AGNES_PRESET: Provider = {
  id: 'agnes',
  name: 'Agnes AI',
  baseUrl: 'https://apihub.agnes-ai.com/v1',
  apiKey: '',
  builtin: true,
  models: [
    {
      id: 'agnes:agnes-2.5-flash',
      name: 'agnes-2.5-flash',
      inputs: { text: true, image: true, file: false },
    },
  ],
}

/**
 * 备用内置提供商：OpenCode Zen（OpenAI 兼容）。
 * 仅开发构建注入，见 `WITH_PROVIDER_PRESETS`。
 * baseUrl：`https://opencode.ai/zen/v1`；模型 ID 为 `GET /models` 的真实返回值。
 * 付费模型需在 OpenCode 工作区绑定付款方式；免费额度仅限其官方客户端。
 */
export const OPENCODE_ZEN_PRESET: Provider = {
  id: 'opencode-zen',
  name: 'OpenCode Zen',
  baseUrl: 'https://opencode.ai/zen/v1',
  apiKey: '',
  builtin: true,
  models: [
    {
      id: 'opencode-zen:deepseek-v4-flash',
      name: 'deepseek-v4-flash',
      inputs: { text: true, image: false, file: false },
    },
    {
      id: 'opencode-zen:gemini-3.1-pro',
      name: 'gemini-3.1-pro',
      inputs: { text: true, image: true, file: true },
    },
  ],
}

export const DEFAULT_TOOLS: ToolItem[] = [
  { id: 'pageTranslate', label: '网页翻译', type: 'toggle', visible: true, order: 0 },
  { id: 'hoverTranslate', label: '悬浮翻译', type: 'toggle', visible: true, order: 1 },
  { id: 'selectionTranslate', label: '划词翻译', type: 'toggle', visible: true, order: 2 },
  { id: 'vocab', label: '生词本', type: 'action', visible: true, order: 3 },
  { id: 'settings', label: '设置', type: 'action', visible: true, order: 4 },
]

/**
 * 离线词典清单：数据不打包进扩展，**首次使用时按需下载**（见 apps/extension/lib/dictionaryStore）。
 * - ecdict-zh：open-ecdict《现代英汉》英→中，**首次使用时自动下载并启用**（defaultInstall）。
 * - wordset：Wordset 英英（CC BY-SA 4.0 + WordNet），**按首字母懒加载**，逐字母下载。
 * - cc-cedict：CC-CEDICT 中→英（CC BY-SA），gzip 文本。
 * - jmdict：JMdict 日→英（EDRDG），gzip XML。
 * - freedict-*：FreeDict 英→法/葡/阿（GPL），TEI。
 * `sourceLang` 用于按脚本粗筛（避免用中文词典查英文单词）；
 * 目标语言没有对应离线词典时（如日/韩/德/西），一律交给 AI 翻译。
 */
export const DICTIONARIES: DictionaryItem[] = [
  {
    id: 'ecdict-zh',
    name: '英汉词典（现代英汉）',
    langPair: '英 → 中',
    license: '见来源说明',
    size: '~2.8 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'open-ecdict',
    url: 'https://cdn.jsdelivr.net/gh/mahavivo/open-ecdict@master/data/%E7%8E%B0%E4%BB%A3%E8%8B%B1%E6%B1%89%E8%AF%8D%E5%85%B8.txt',
    attribution: 'open-ecdict（数据源自《现代英汉词典》，许可待确认，见 THIRD-PARTY.md）',
    targetLang: 'zh-CN',
    sourceLang: 'en',
    defaultInstall: true,
  },
  {
    id: 'wordset',
    name: 'Wordset 英英（CC BY-SA）',
    langPair: '英 → 英',
    license: 'CC BY-SA 4.0',
    size: '按首字母下载（0.1–7 MB）',
    installed: false,
    enabled: true,
    format: 'wordset-letters',
    perLetter: true,
    attribution: 'Wordset (CC BY-SA 4.0) + WordNet 3.0',
    targetLang: 'en',
    sourceLang: 'en',
  },
  {
    id: 'cc-cedict',
    name: 'CC-CEDICT 汉英',
    langPair: '中 → 英',
    license: 'CC BY-SA 4.0',
    size: '~4 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'cedict-txt',
    gzip: true,
    url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
    attribution: 'CC-CEDICT (CC BY-SA 4.0)，由 MDBG 分发',
    targetLang: 'en',
    sourceLang: 'zh',
  },
  {
    id: 'jmdict',
    name: 'JMdict 日英',
    langPair: '日 → 英',
    license: 'EDRDG / CC BY-SA 4.0',
    size: '~10 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'jmdict-xml',
    gzip: true,
    url: 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz',
    attribution: 'JMdict © Electronic Dictionary Research and Development Group (EDRDG)',
    targetLang: 'en',
    sourceLang: 'ja',
  },
  {
    id: 'freedict-fr',
    name: 'FreeDict 英法',
    langPair: '英 → 法',
    license: 'GPL',
    size: '~3.3 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'freedict-tei',
    url: 'https://cdn.jsdelivr.net/gh/freedict/fd-dictionaries@master/eng-fra/eng-fra.tei',
    attribution: 'FreeDict eng-fra (GPL)',
    targetLang: 'fr',
    sourceLang: 'en',
  },
  {
    id: 'freedict-pt',
    name: 'FreeDict 英葡',
    langPair: '英 → 葡',
    license: 'GPL',
    size: '~6.6 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'freedict-tei',
    url: 'https://cdn.jsdelivr.net/gh/freedict/fd-dictionaries@master/eng-por/eng-por.tei',
    attribution: 'FreeDict eng-por (GPL)',
    targetLang: 'pt',
    sourceLang: 'en',
  },
  {
    id: 'freedict-ar',
    name: 'FreeDict 英阿',
    langPair: '英 → 阿',
    license: 'GPL',
    size: '~19 MB（首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'freedict-tei',
    url: 'https://cdn.jsdelivr.net/gh/freedict/fd-dictionaries@master/eng-ara/eng-ara.tei',
    attribution: 'FreeDict eng-ara (GPL)',
    targetLang: 'ar',
    sourceLang: 'en',
  },
]

export const DEFAULT_SETTINGS: Settings = {
  providers: WITH_PROVIDER_PRESETS ? [OPENROUTER_PRESET, AGNES_PRESET] : [],
  activeProviderId: WITH_PROVIDER_PRESETS ? OPENROUTER_PRESET.id : '',
  activeModel: WITH_PROVIDER_PRESETS ? OPENROUTER_PRESET.models[0]!.name : '',
  sourceLang: 'auto',
  targetLang: DEFAULT_TARGET_LANG,
  features: { pageTranslate: false, selectionTranslate: true, hoverTranslate: false },
  hover: { delay: 450, scope: 'word' },
  floatingBall: { enabled: true, position: 'right', expand: 'radial', tools: DEFAULT_TOOLS },
  vocab: { autoAdd: false, wordOnly: true },
  theme: 'system',
  uiLang: 'zh',
  onlineDictionaryFallback: true,
  dictionaries: Object.fromEntries(DICTIONARIES.map(d => [d.id, { installed: d.installed, enabled: d.enabled }])),
}

export function findModel(providers: Provider[], providerId: string, modelName: string): ModelDef | undefined {
  return providers.find(p => p.id === providerId)?.models.find(m => m.name === modelName)
}

import type { DictionaryItem, ModelDef, Provider, Settings, ToolItem } from './types'
import { DEFAULT_TARGET_LANG } from './langs'

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
} as const

/**
 * 默认模型提供商：OpenRouter（OpenAI 兼容，默认包含两个免费模型）。
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
 * - ecdict：ECDICT CSV（MIT），jsDelivr 上的样例文件（完整版体积大，可用自定义源）。
 * - wordset：Wordset 英英（CC BY-SA 4.0 + WordNet），**按首字母懒加载**，逐字母下载。
 */
export const DICTIONARIES: DictionaryItem[] = [
  {
    id: 'ecdict',
    name: 'ECDICT 英汉（MIT）',
    langPair: '英 → 中',
    license: 'MIT',
    size: '~4 KB（样例，首次使用时下载）',
    installed: false,
    enabled: true,
    format: 'ecdict-csv',
    url: 'https://cdn.jsdelivr.net/gh/skywind3000/ECDICT@master/ecdict.mini.csv',
    attribution: 'ECDICT © skywind3000 (MIT)',
    targetLang: 'zh-CN',
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
  },
  { id: 'cc-cedict', name: 'CC-CEDICT 汉英', langPair: '中 → 英', license: 'CC BY-SA', size: '待补充数据源', installed: false, enabled: false },
  { id: 'jmdict', name: 'JMdict 日英', langPair: '日 → 英', license: 'EDRDG', size: '待补充数据源', installed: false, enabled: false },
  { id: 'freedict', name: 'FreeDict 多语种', langPair: '多语', license: 'GPL', size: '待补充数据源', installed: false, enabled: false },
]

export const DEFAULT_SETTINGS: Settings = {
  providers: [OPENROUTER_PRESET, AGNES_PRESET],
  activeProviderId: OPENROUTER_PRESET.id,
  activeModel: OPENROUTER_PRESET.models[0]!.name, // 默认 glm-5.2:free（文本输入输出）
  sourceLang: 'auto',
  targetLang: DEFAULT_TARGET_LANG,
  features: { pageTranslate: false, selectionTranslate: true, hoverTranslate: false },
  hover: { delay: 450, scope: 'word' },
  floatingBall: { enabled: true, position: 'right', expand: 'radial', tools: DEFAULT_TOOLS },
  vocab: { autoAdd: true, wordOnly: true },
  theme: 'system',
  uiLang: 'zh',
  onlineDictionaryFallback: true,
  dictionaries: Object.fromEntries(DICTIONARIES.map(d => [d.id, { installed: d.installed, enabled: d.enabled }])),
}

export function findModel(providers: Provider[], providerId: string, modelName: string): ModelDef | undefined {
  return providers.find(p => p.id === providerId)?.models.find(m => m.name === modelName)
}

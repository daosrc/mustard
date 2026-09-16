import type { DictionaryItem, ModelDef, Provider, Settings, ToolItem } from './types'
import { DEFAULT_TARGET_LANG } from './langs'

/** chrome.storage.local 键名 */
export const STORAGE_KEYS = {
  settings: 'mustard:settings',
  vocab: 'mustard:vocab',
  sessions: 'mustard:sessions',
  cache: 'mustard:cache',
} as const

/**
 * 默认模型提供商：OpenCode Zen（OpenAI 兼容）。
 * ⚠️ baseUrl / 鉴权 / 模型 ID 均为占位，以官方文档为准；用户需在设置页填入 API Key。
 */
export const OPENCODE_ZEN_PRESET: Provider = {
  id: 'opencode-zen',
  name: 'OpenCode Zen',
  baseUrl: 'https://opencode.ai/zen/v1',
  apiKey: '',
  builtin: true,
  models: [
    {
      id: 'opencode-zen:deepseek-v4.1-flash',
      name: 'deepseek/deepseek-v4.1-flash',
      inputs: { text: true, image: false, file: false },
    },
    {
      id: 'opencode-zen:claude-sonnet-4.5',
      name: 'claude-sonnet-4.5',
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

export const DICTIONARIES: DictionaryItem[] = [
  { id: 'ecdict', name: 'ECDICT 英汉双解', langPair: '英 → 中', license: 'MIT', size: '8.2 MB', builtin: true, installed: true, enabled: true },
  { id: 'wordnet', name: 'WordNet 英英释义', langPair: '英 → 英', license: 'WordNet', size: '12 MB', builtin: true, installed: false, enabled: false },
  { id: 'cc-cedict', name: 'CC-CEDICT 汉英', langPair: '中 → 英', license: 'CC BY-SA', size: '4.1 MB', installed: false, enabled: false },
  { id: 'jmdict', name: 'JMdict 日英', langPair: '日 → 英', license: 'EDRDG', size: '28 MB', installed: false, enabled: false },
  { id: 'freedict', name: 'FreeDict 多语种', langPair: '多语', license: 'GPL', size: '按需下载', installed: false, enabled: false },
]

export const DEFAULT_SETTINGS: Settings = {
  providers: [OPENCODE_ZEN_PRESET],
  activeProviderId: OPENCODE_ZEN_PRESET.id,
  activeModel: OPENCODE_ZEN_PRESET.models[1]!.name, // 默认选多模态模型
  sourceLang: 'auto',
  targetLang: DEFAULT_TARGET_LANG,
  features: { pageTranslate: false, selectionTranslate: true, hoverTranslate: false },
  hover: { delay: 450, scope: 'word' },
  floatingBall: { enabled: true, position: 'right', expand: 'radial', tools: DEFAULT_TOOLS },
  vocab: { autoAdd: true, wordOnly: true },
  theme: 'system',
  onlineDictionaryFallback: true,
  dictionaries: Object.fromEntries(DICTIONARIES.map(d => [d.id, { installed: d.installed, enabled: d.enabled }])),
}

export function findModel(providers: Provider[], providerId: string, modelName: string): ModelDef | undefined {
  return providers.find(p => p.id === providerId)?.models.find(m => m.name === modelName)
}

import type { Locale } from './links'
import { LINKS } from './links'

export type Visual
  = | 'selection'
    | 'hover'
    | 'page'
    | 'image'
    | 'chat'
    | 'vocab'
    | 'dict'
    | 'providers'

export interface Feature {
  title: string
  desc: string
  visual: Visual
}

export type InstallOption
  = | { kind: 'steps', title: string, desc: string, steps: Array<{ cmd: string, note: string }> }
    | { kind: 'code', title: string, desc: string, code: string[], note: string }

export interface Content {
  lang: string
  title: string
  description: string
  nav: { features: string, steps: string, install: string, github: string, altLabel: string, altHref: string }
  hero: { badge: string, title: string, slogan: string, tagline: string, install: string, source: string }
  featuresTitle: string
  features: Feature[]
  stepsTitle: string
  steps: Array<{ n: string, title: string, desc: string }>
  moreTitle: string
  more: Array<{ title: string, desc: string }>
  ossTitle: string
  ossDesc: string
  installTitle: string
  installDesc: string
  installOptions: InstallOption[]
}

const repo = LINKS.repo

const zh: Content = {
  lang: 'zh-CN',
  title: 'Mustard 芥末 · 开源 Chrome 划词翻译插件',
  description: '划词 / 悬浮 / 网页 / 截图翻译 + 侧边栏 AI 对话、生词本与记词、离线词典。开源（MIT）。',
  nav: { features: '功能', steps: '使用', install: '安装', github: 'GitHub', altLabel: 'English', altHref: './en/' },
  hero: {
    badge: '开源浏览器翻译插件',
    title: 'Mustard 芥末',
    slogan: '流畅阅读',
    tagline: '划词 / 悬浮 / 网页 / 截图翻译，侧边栏 AI 对话，生词本与记词，离线词典。',
    install: '安装（GitHub）',
    source: '查看源码',
  },
  featuresTitle: '功能',
  features: [
    { title: '划词翻译', desc: '选中即译：音标、词性、释义、例句一目了然，支持发音与一键加入生词本。', visual: 'selection' },
    { title: '悬浮翻译', desc: '鼠标停留即显示译文，可配置延迟与取词范围（单词 / 整句），不打断阅读。', visual: 'hover' },
    { title: '网页翻译', desc: '整页双语对照，逐段追加译文并支持增量翻译，随时一键还原原文。', visual: 'page' },
    { title: '截图翻译', desc: '直接粘贴截图（⌘V / Ctrl+V），由多模态模型识别并翻译图片中的文字。', visual: 'image' },
    { title: '侧边栏 AI 对话', desc: '按提供商选择模型，流式输出；按模型能力门控附件与图片输入。', visual: 'chat' },
    { title: '生词本与记词', desc: '翻译后可一键收录（可选自动收录，默认关闭），支持搜索筛选与导入导出；听音默写，连续答对 3 次判定掌握。', visual: 'vocab' },
    { title: '离线词典', desc: '本地词典 → 在线词典 → AI 分级查询；首次使用自动装好英汉词典，另有英英 / 中英 / 日英 / 英法葡阿，按需下载后离线可查。', visual: 'dict' },
    { title: '模型提供商', desc: '支持自定义 OpenAI 兼容提供商，模型逐条配置能力。', visual: 'providers' },
  ],
  stepsTitle: '三步上手',
  steps: [
    { n: '01', title: '安装扩展', desc: '从 GitHub Releases 下载 zip 解压，或在开发者模式加载已解压的扩展程序。' },
    { n: '02', title: '配置模型', desc: '在设置页添加模型提供商并填入 API Key（可选，不填也能用词典翻译）。' },
    { n: '03', title: '开始使用', desc: '划词、悬浮或开启网页翻译；打开侧边栏与 AI 对话，收录生词并记词。' },
  ],
  moreTitle: '更多细节',
  more: [
    { title: '目标语言', desc: '默认简体中文，支持英/日/韩/法/德/西/俄等主流语种。' },
    { title: '会话历史', desc: '自动保存会话，可切换、删除与完整载入。' },
    { title: '单词发音', desc: '划词卡片、生词本与记词均支持发音（Web Speech）。' },
    { title: '悬浮球工具', desc: '工具可排序、显隐，径向或纵向展开，位置左右可选。' },
    { title: '主题', desc: '芥末绿视觉体系，支持跟随系统 / 浅色 / 深色。' },
  ],
  ossTitle: '开源与贡献',
  ossDesc: 'Mustard 采用 MIT 许可，欢迎提交 Issue 与 PR。内置词典数据遵循其原始许可。',
  installTitle: '安装与使用',
  installDesc: '从 GitHub Releases 下载打包好的扩展，或从源码构建。',
  installOptions: [
    {
      kind: 'steps',
      title: '使用 Release 包',
      desc: '无需构建，下载即用，适合大多数用户。',
      steps: [
        { cmd: '打开 GitHub Releases', note: '下载最新 mustard-translate-*.zip 并解压到任意目录' },
        { cmd: 'chrome://extensions', note: '打开该地址并开启右上角「开发者模式」' },
        { cmd: '加载已解压的扩展程序', note: '选择刚解压出来的目录即可完成安装' },
      ],
    },
    {
      kind: 'code',
      title: '从源码构建',
      desc: '适合开发者，可直接改源码、二次开发。',
      code: [`git clone ${repo}`, 'pnpm install', 'pnpm build:ext'],
      note: '构建完成后，在 chrome://extensions 中「加载已解压的扩展程序」，选择 apps/extension/.output/chrome-mv3。',
    },
  ],
}

const en: Content = {
  lang: 'en',
  title: 'Mustard · Open-source Chrome translation extension',
  description: 'Select, hover, page and screenshot translation with a side-panel AI chat, vocabulary and dictation, and offline dictionaries. MIT.',
  nav: { features: 'Features', steps: 'Get started', install: 'Install', github: 'GitHub', altLabel: '中文', altHref: '../' },
  hero: {
    badge: 'Open-source browser translation extension',
    title: 'Mustard',
    slogan: 'Read fluently',
    tagline: 'Select, hover, page and screenshot translation, a side-panel AI chat, vocabulary with dictation, and offline dictionaries.',
    install: 'Install (GitHub)',
    source: 'Source code',
  },
  featuresTitle: 'Features',
  features: [
    { title: 'Select to translate', desc: 'Select any text to get phonetics, part of speech, definitions and examples, with pronunciation and one-click add to vocabulary.', visual: 'selection' },
    { title: 'Hover translation', desc: 'Pause on a word or sentence to see the translation, with configurable delay and scope (word / sentence).', visual: 'hover' },
    { title: 'Full-page translation', desc: 'Bilingual paragraphs appended in place with incremental translation, restorable at any time.', visual: 'page' },
    { title: 'Screenshot translation', desc: 'Paste a screenshot (⌘V / Ctrl+V) and let a multimodal model read and translate the text inside.', visual: 'image' },
    { title: 'Side-panel AI chat', desc: 'Pick a model per provider with streaming output; attachments and image input are gated by model capabilities.', visual: 'chat' },
    { title: 'Vocabulary & dictation', desc: 'Save a word with one click (optional auto-save, off by default), searchable and importable/exportable; listen-and-spell with mastery after 3 correct answers.', visual: 'vocab' },
    { title: 'Offline dictionaries', desc: 'Local → online → AI fallback; the English→Chinese dictionary installs on first use, with EN→EN, ZH→EN, JA→EN and EN→FR/PT/AR available on demand.', visual: 'dict' },
    { title: 'Model providers', desc: 'Custom OpenAI-compatible providers with per-model capabilities.', visual: 'providers' },
  ],
  stepsTitle: 'Get started in three steps',
  steps: [
    { n: '01', title: 'Install the extension', desc: 'Download the zip from GitHub Releases, or load the unpacked extension in developer mode.' },
    { n: '02', title: 'Configure a model', desc: 'Add a model provider and its API key in settings (optional — dictionary translation works without it).' },
    { n: '03', title: 'Start using', desc: 'Select, hover or enable full-page translation; open the side panel to chat, save and practice words.' },
  ],
  moreTitle: 'More details',
  more: [
    { title: 'Target language', desc: 'Simplified Chinese by default; English, Japanese, Korean, French, German, Spanish, Russian and more.' },
    { title: 'Session history', desc: 'Conversations are saved automatically, and can be switched, deleted or restored in full.' },
    { title: 'Pronunciation', desc: 'Playback for the selection card, vocabulary and dictation (Web Speech).' },
    { title: 'Floating ball tools', desc: 'Reorder and show/hide tools, radial or stacked, pinned left or right.' },
    { title: 'Theme', desc: 'A mustard-green design system with system / light / dark modes.' },
  ],
  ossTitle: 'Open source & contributing',
  ossDesc: 'Mustard is MIT licensed. Issues and PRs are welcome. Bundled dictionary data keeps its original licenses.',
  installTitle: 'Install & usage',
  installDesc: 'Download the packaged extension from GitHub Releases, or build from source.',
  installOptions: [
    {
      kind: 'steps',
      title: 'Use a release zip',
      desc: 'No build required — download and go, fits most users.',
      steps: [
        { cmd: 'Open GitHub Releases', note: 'Download the latest mustard-translate-*.zip and unzip it anywhere' },
        { cmd: 'chrome://extensions', note: 'Open the URL and enable "Developer mode" (top-right)' },
        { cmd: 'Load unpacked', note: 'Click "Load unpacked" and pick the folder you just extracted' },
      ],
    },
    {
      kind: 'code',
      title: 'Build from source',
      desc: 'For developers — hack the source and contribute.',
      code: [`git clone ${repo}`, 'pnpm install', 'pnpm build:ext'],
      note: 'Then load apps/extension/.output/chrome-mv3 via "Load unpacked" at chrome://extensions.',
    },
  ],
}

export const CONTENT: Record<Locale, Content> = { zh, en }

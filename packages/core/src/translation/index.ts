import type { ChatMessage, ChatRole, DictResult, LangCode, ModelDef, Provider, SourceLang } from '@mustard/shared'
import { cacheKey, LRU } from '@mustard/utils'
import { lookupOnline } from '../dictionary/online'
import { chatOnce } from '../providers/client'

export interface TranslateResult {
  text: string
  card?: DictResult
}

export interface AiTarget {
  provider: Provider
  model: ModelDef
}

export interface TranslateOptions {
  /** 是否允许在线词典兜底（settings.onlineDictionaryFallback） */
  online?: boolean
  ai?: AiTarget
}

export const WORD_CARD_SYSTEM_PROMPT
  = '你是词典。只输出 JSON，不要多余文字。格式：{"word":string,"phonetic":string,"partOfSpeech":string,"translation":string,"examples":string[]}'

function message(role: ChatRole, content: string): ChatMessage {
  return { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, content, createdAt: Date.now() }
}

/** 从模型输出中解析词条 JSON（容忍 ```json 包裹） */
export function parseWordCard(raw: string, fallbackWord: string): DictResult | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match)
    return null
  try {
    const json = JSON.parse(match[0]) as Partial<DictResult>
    if (!json.translation)
      return null
    return {
      word: json.word || fallbackWord,
      phonetic: json.phonetic,
      partOfSpeech: json.partOfSpeech,
      translation: json.translation,
      examples: json.examples?.filter(Boolean),
      source: 'ai',
    }
  }
  catch {
    return null
  }
}

const cache = new LRU<string, TranslateResult>(500)

async function aiWordCard(word: string, sourceLang: SourceLang, targetLang: LangCode, ai: AiTarget): Promise<DictResult | null> {
  const content = await chatOnce(ai.provider, ai.model, [
    message('system', WORD_CARD_SYSTEM_PROMPT),
    message('user', `单词：${word}\n源语言：${sourceLang}\n目标语言：${targetLang}\n请给出词条信息。`),
  ])
  return parseWordCard(content, word)
}

/**
 * 单词查询链路：本地词典（M8 接入 ECDICT）→ 在线词典 → AI。
 * 无 AI Key 时仍可仅凭在线词典可用。
 */
export async function translateWord(
  word: string,
  sourceLang: SourceLang,
  targetLang: LangCode,
  options: TranslateOptions = {},
): Promise<TranslateResult> {
  const term = word.trim()
  if (!term)
    return { text: '' }

  const key = cacheKey('w', term.toLowerCase(), sourceLang, targetLang, options.online === false ? 'off' : 'on', options.ai ? 'ai' : 'noai')
  const cached = cache.get(key)
  if (cached)
    return cached

  let card: DictResult | null = null
  if (options.online !== false)
    card = await lookupOnline(term, targetLang)
  if (!card && options.ai)
    card = await aiWordCard(term, sourceLang, targetLang, options.ai)

  const result: TranslateResult = card ? { text: card.translation, card } : { text: '' }
  if (result.text)
    cache.set(key, result)
  return result
}

/** 句子/段落：直接走 AI（词典无法胜任） */
export async function translateSentence(
  text: string,
  sourceLang: SourceLang,
  targetLang: LangCode,
  ai?: AiTarget,
): Promise<TranslateResult> {
  const value = text.trim()
  if (!value)
    return { text: '' }

  const key = cacheKey('t', value, sourceLang, targetLang, ai ? 'ai' : 'noai')
  const cached = cache.get(key)
  if (cached)
    return cached
  if (!ai)
    return { text: '' }

  const content = await chatOnce(ai.provider, ai.model, [
    message('system', `你是翻译引擎。请把用户文本翻译为 ${targetLang}，只输出译文，不要解释。`),
    message('user', value),
  ])
  const result: TranslateResult = { text: content.trim() }
  if (result.text)
    cache.set(key, result)
  return result
}

/** 纯词典查询（LOOKUP_WORD） */
export async function lookupWord(word: string, targetLang: LangCode): Promise<DictResult | null> {
  return lookupOnline(word, targetLang)
}

import type { ChatMessage, ChatRole, DictResult, LangCode, ModelDef, Provider, SourceLang } from '@mustard/shared'
import { langOption } from '@mustard/shared'
import { cacheKey, LRU } from '@mustard/utils'
import { lookupOnline } from '../dictionary/online'
import { chatOnce, errorCode, ProviderError } from '../providers/client'

/** 提示词里用可读语言名（模型对 `简体中文` 的把握比 `zh-CN` 好，避免输出繁体） */
function langName(targetLang: LangCode): string {
  return langOption(targetLang)?.label ?? targetLang
}

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
  /** 本地离线词典查询（按目标语言筛选；首次使用时下载；可为异步） */
  local?: (word: string) => DictResult | null | Promise<DictResult | null>
  /** 主模型失败（如 429）时依次尝试的其他模型 */
  aiFallbacks?: AiTarget[]
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
    message('user', `单词：${word}\n源语言：${sourceLang}\n目标语言：${langName(targetLang)}\n请给出词条信息。`),
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

  const key = cacheKey('w', term.toLowerCase(), sourceLang, targetLang, options.online === false ? 'off' : 'on', options.ai ? 'ai' : 'noai', options.local ? 'local' : 'nolocal')
  const cached = cache.get(key)
  if (cached)
    return cached

  // 结果语言必须与目标语言一致：本地词典只查目标语言匹配的词典，
  // 在线词典只有英英（dictionaryapi.dev），故仅在目标为英文时使用；
  // 其余情况一律交给 AI，宁可空也不返回错误语言的释义。
  let card: DictResult | null = (await options.local?.(term)) ?? null
  if (!card && targetLang === 'en' && options.online !== false)
    card = await lookupOnline(term, targetLang)
  if (!card) {
    const targets = [options.ai, ...(options.aiFallbacks ?? [])].filter((t): t is AiTarget => !!t)
    for (const target of targets) {
      try {
        card = await aiWordCard(term, sourceLang, targetLang, target)
        if (card)
          break
      }
      catch {
        // 该模型失败（如 429/网络）→ 尝试下一个
      }
    }
  }
  if (!card && targetLang === 'en' && options.online !== false)
    card = await lookupOnline(term, targetLang)

  const result: TranslateResult = card ? { text: card.translation, card } : { text: '' }
  if (result.text)
    cache.set(key, result)
  return result
}

/** 句子/段落：直接走 AI（词典无法胜任）；主模型失败时依次回退其他模型 */
export async function translateSentence(
  text: string,
  sourceLang: SourceLang,
  targetLang: LangCode,
  ai?: AiTarget,
  aiFallbacks?: AiTarget[],
): Promise<TranslateResult> {
  const value = text.trim()
  if (!value)
    return { text: '' }

  const key = cacheKey('t', value, sourceLang, targetLang, ai ? 'ai' : 'noai')
  const cached = cache.get(key)
  if (cached)
    return cached

  const targets = [ai, ...(aiFallbacks ?? [])].filter((t): t is AiTarget => !!t)
  for (const target of targets) {
    try {
      const content = await chatOnce(target.provider, target.model, [
        message('system', `你是翻译引擎。请把用户文本翻译为${langName(targetLang)}，只输出译文，不要解释，不要输出任何多余内容。`),
        message('user', value),
      ])
      const result: TranslateResult = { text: content.trim() }
      if (result.text) {
        cache.set(key, result)
        return result
      }
    }
    catch {
      // 该模型失败（429/网络）→ 尝试下一个
    }
  }
  return { text: '' }
}

/** 从模型输出里解析字符串数组（容忍 ```json 包裹与多余文字） */
function parseStringArray(raw: string): string[] | null {
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match)
    return null
  try {
    const json = JSON.parse(match[0]) as unknown
    if (!Array.isArray(json))
      return null
    return json.map(item => (typeof item === 'string' ? item : String(item ?? '')))
  }
  catch {
    return null
  }
}

/**
 * 批量段落翻译（网页翻译用）：一次请求翻译多段，显著减少请求数与限流风险。
 * 命中缓存的不再请求；模型返回数量不匹配时二分拆小重试，最终回退逐条翻译。
 */
/** 不可重试/拆分的错误（缺 Key、鉴权失败等），直接放弃该分支 */
const FATAL_ERROR = /MISSING_API_KEY|PROVIDER_ERROR_(?:401|403|404)/
/** 限流后的全局冷却，避免继续轰炸供应商 */
let cooldownUntil = 0

async function waitCooldown(): Promise<void> {
  const wait = cooldownUntil - Date.now()
  if (wait > 0)
    await new Promise(resolve => setTimeout(resolve, wait))
}

async function requestBatch(target: AiTarget, items: string[], targetLang: LangCode): Promise<string[] | null> {
  await waitCooldown()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 45_000)
  try {
    const content = await chatOnce(target.provider, target.model, [
      message('system', `你是翻译引擎。用户会给出一个 JSON 字符串数组，请逐项翻译为${langName(targetLang)}，只输出与输入等长的 JSON 字符串数组，顺序保持一致，不要解释，不要输出任何多余内容。`),
      message('user', JSON.stringify(items)),
    ], controller.signal)
    const parsed = parseStringArray(content)
    if (!parsed || parsed.length !== items.length)
      return null
    return parsed
  }
  catch (error) {
    const code = errorCode(error)
    if (FATAL_ERROR.test(code))
      throw new ProviderError('FATAL', code)
    if (/429/.test(code))
      cooldownUntil = Date.now() + 4000
    throw error
  }
  finally {
    clearTimeout(timer)
  }
}

/**
 * 先整批请求，失败才二分拆小，最终回退到单条 —— 正常页面只需 1~2 次请求，
 * 只有失败的分支才会继续拆到「单独请求出错的那一段」。
 */
async function translateItems(
  items: string[],
  sourceLang: SourceLang,
  targetLang: LangCode,
  ai?: AiTarget,
  aiFallbacks?: AiTarget[],
): Promise<string[]> {
  if (!items.length)
    return []
  const targets = [ai, ...(aiFallbacks ?? [])].filter((t): t is AiTarget => !!t)
  for (const target of targets) {
    let mismatch = false
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parsed = await requestBatch(target, items, targetLang)
        if (parsed)
          return parsed.map(item => item.trim())
        // 返回数组长度不匹配：是这一批本身的问题（太长/条目太多），
        // 重试同一个请求只会再失败一次，直接跳出交给二分拆分
        mismatch = true
        break
      }
      catch (error) {
        if (error instanceof ProviderError && error.code === 'FATAL')
          return items.map(() => '')
        // 网络/限流等瞬时错误：换目标前重试一次
        if (attempt === 0)
          await new Promise(resolve => setTimeout(resolve, 600))
      }
    }
    if (mismatch)
      break
  }
  if (items.length === 1)
    return [(await translateSentence(items[0]!, sourceLang, targetLang, ai, aiFallbacks)).text]
  // 批量失败：二分拆小，避免逐条请求造成的请求风暴
  const mid = Math.ceil(items.length / 2)
  const [head, tail] = await Promise.all([
    translateItems(items.slice(0, mid), sourceLang, targetLang, ai, aiFallbacks),
    translateItems(items.slice(mid), sourceLang, targetLang, ai, aiFallbacks),
  ])
  return [...head, ...tail]
}

export async function translateBlocks(
  texts: string[],
  sourceLang: SourceLang,
  targetLang: LangCode,
  ai?: AiTarget,
  aiFallbacks?: AiTarget[],
): Promise<string[]> {
  const out = texts.map(() => '')
  const pending: number[] = []
  texts.forEach((raw, i) => {
    const value = raw.trim()
    if (!value)
      return
    const cached = cache.get(cacheKey('t', value, sourceLang, targetLang, ai ? 'ai' : 'noai'))
    if (cached?.text)
      out[i] = cached.text
    else
      pending.push(i)
  })
  if (!pending.length)
    return out

  const results = await translateItems(pending.map(i => texts[i]!.trim()), sourceLang, targetLang, ai, aiFallbacks)
  pending.forEach((i, k) => {
    const value = results[k]?.trim() ?? ''
    out[i] = value
    if (value)
      cache.set(cacheKey('t', texts[i]!.trim(), sourceLang, targetLang, ai ? 'ai' : 'noai'), { text: value })
  })
  return out
}

/** 纯词典查询（LOOKUP_WORD） */
export async function lookupWord(word: string, targetLang: LangCode): Promise<DictResult | null> {
  return lookupOnline(word, targetLang)
}

/** 截图/图片翻译：交给多模态模型识别并翻译（需支持图片输入的模型） */
export async function translateImage(dataUrl: string, targetLang: LangCode, ai: AiTarget): Promise<string> {
  const message: ChatMessage = {
    id: `img-${Date.now()}`,
    role: 'user',
    content: `请识别图片中的文字并翻译为${langName(targetLang)}，只输出译文，不要解释。`,
    attachments: [{ type: 'image', name: 'image.png', dataUrl }],
    createdAt: Date.now(),
  }
  const content = await chatOnce(ai.provider, ai.model, [message])
  return content.trim()
}

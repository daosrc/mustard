import type { DictResult, LangCode } from '@mustard/shared'

interface FreeDictEntry {
  word?: string
  phonetic?: string
  phonetics?: Array<{ text?: string }>
  meanings?: Array<{
    partOfSpeech?: string
    definitions?: Array<{ definition?: string, example?: string }>
  }>
}

const ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en'
const TIMEOUT_MS = 900

/**
 * 在线免费词典兜底（Free Dictionary API，基于 Wiktionary，无需 Key）。
 * 未命中 / 超时（≤900ms）/ 网络失败均返回 null，由调用方继续降级。
 */
export async function lookupOnline(word: string, _targetLang?: LangCode): Promise<DictResult | null> {
  const term = word.trim()
  if (!term)
    return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(term)}`, { signal: controller.signal })
    if (!res.ok)
      return null
    const data = await res.json() as FreeDictEntry[]
    const entry = data?.[0]
    if (!entry)
      return null

    const meaning = entry.meanings?.[0]
    const definition = meaning?.definitions?.[0]?.definition
    if (!definition)
      return null

    const examples = (meaning?.definitions ?? [])
      .map(d => d.example)
      .filter((x): x is string => !!x)
      .slice(0, 3)

    return {
      word: entry.word ?? term,
      phonetic: entry.phonetic ?? entry.phonetics?.find(p => p.text)?.text,
      partOfSpeech: meaning?.partOfSpeech,
      translation: definition,
      examples,
      source: 'online',
    }
  }
  catch {
    return null
  }
  finally {
    clearTimeout(timer)
  }
}

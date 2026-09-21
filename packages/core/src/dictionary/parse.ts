import type { LocalEntry } from './local'

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        }
        else {
          quoted = false
        }
      }
      else {
        cur += ch
      }
    }
    else if (ch === '"') {
      quoted = true
    }
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    }
    else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

/**
 * ECDICT CSV：`word,phonetic,definition,translation,pos,...`（MIT）。
 * translation 优先，其次英文 definition；`\n` 转分号。
 */
export function parseEcdictCsv(text: string): LocalEntry[] {
  const out: LocalEntry[] = []
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line)
      continue
    if (i === 0 && line.startsWith('word,'))
      continue
    const cols = parseCsvLine(line)
    const word = cols[0]?.trim()
    if (!word)
      continue
    const translation = (cols[3] || cols[2] || '').replace(/\\n/g, '；').trim()
    if (!translation)
      continue
    out.push({
      word,
      phonetic: cols[1]?.trim() || undefined,
      partOfSpeech: cols[4]?.trim() || undefined,
      translation,
    })
  }
  return out
}

/**
 * open-ecdict 英汉文本：每行 `word ⇒ /phonetic/ 释义`（`⇒` 分隔）。
 * 用于英译中离线词典。
 */
export function parseOpenEcdictTxt(text: string): LocalEntry[] {
  const index = new Map<string, LocalEntry>()
  for (const line of text.split(/\r?\n/)) {
    const idx = line.indexOf('⇒')
    if (idx < 0)
      continue
    const word = line.slice(0, idx).trim()
    let rest = line.slice(idx + 1).trim()
    if (!word || !rest)
      continue
    const phoneticMatch = rest.match(/^\/[^/]*\/\s*/)
    const phonetic = phoneticMatch ? phoneticMatch[0].trim() : undefined
    if (phoneticMatch)
      rest = rest.slice(phoneticMatch[0].length)

    const key = word.toLowerCase()
    const existing = index.get(key)
    if (existing) {
      // 同词多行（不同词性/释义）合并
      existing.translation = `${existing.translation}\n${rest}`
      if (!existing.phonetic && phonetic)
        existing.phonetic = phonetic
    }
    else {
      index.set(key, { word, phonetic, translation: rest })
    }
  }
  return [...index.values()]
}

interface WordsetMeaning {
  def?: string
  example?: string
  speech_part?: string
}

interface WordsetEntry {
  word?: string
  meanings?: WordsetMeaning[]
}

/** Wordset 单个字母 JSON（CC BY-SA 4.0 + WordNet）→ LocalEntry[] */
export function parseWordsetJson(raw: string): LocalEntry[] {
  const json = JSON.parse(raw) as Record<string, WordsetEntry>
  const out: LocalEntry[] = []
  for (const [key, entry] of Object.entries(json)) {
    const meanings = entry.meanings ?? []
    const translation = meanings
      .slice(0, 3)
      .map((m) => {
        const pos = m.speech_part ? `${m.speech_part}. ` : ''
        const example = m.example ? ` 例：${m.example}` : ''
        return `${pos}${m.def ?? ''}${example}`.trim()
      })
      .filter(Boolean)
      .join('\n')
    if (!translation)
      continue
    out.push({
      word: entry.word ?? key,
      partOfSpeech: meanings[0]?.speech_part,
      translation,
    })
  }
  return out
}

/** 解出 XML 里最常见的几个实体 */
function decodeXml(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '\u0022')
    .replaceAll('&apos;', '\u0027')
    .replaceAll('&amp;', '&')
}

/**
 * CC-CEDICT（CC BY-SA 4.0）：每行 `繁體 简体 [pin yin] /释义1/释义2/`。
 * 繁体与简体都建索引，便于中文原文按任一字形命中。
 */
export function parseCedictTxt(text: string): LocalEntry[] {
  const index = new Map<string, LocalEntry>()
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#'))
      continue
    const match = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/)
    if (!match)
      continue
    const [, traditional, simplified, pinyin, body] = match
    const translation = body!.split('/').map(s => s.trim()).filter(Boolean).join('；')
    if (!translation)
      continue
    const phonetic = pinyin ? `[${pinyin}]` : undefined
    for (const word of new Set([traditional!, simplified!])) {
      const key = word.toLowerCase()
      const existing = index.get(key)
      if (existing)
        existing.translation = `${existing.translation}\n${translation}`
      else
        index.set(key, { word, phonetic, translation })
    }
  }
  return [...index.values()]
}

/**
 * JMdict（EDRDG）：按行扫描 `<entry>` 块，取 `<keb>`（汉字）/`<reb>`（假名）作词条，
 * `<gloss>` 作英文释义。仅做流式行解析，不构建 DOM。
 */
export function parseJmdictXml(text: string): LocalEntry[] {
  const out: LocalEntry[] = []
  let kanji: string[] = []
  let kana: string[] = []
  let glosses: string[] = []
  let pos = ''

  const flush = (): void => {
    if (glosses.length) {
      const translation = glosses.slice(0, 4).join('；')
      for (const word of new Set(kanji.length ? kanji : kana))
        out.push({ word, partOfSpeech: pos || undefined, translation })
    }
    kanji = []
    kana = []
    glosses = []
    pos = ''
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '</entry>') {
      flush()
      continue
    }
    let match = trimmed.match(/^<keb>([^<]*)<\/keb>/)
    if (match) {
      kanji.push(decodeXml(match[1]!))
      continue
    }
    match = trimmed.match(/^<reb>([^<]*)<\/reb>/)
    if (match) {
      kana.push(decodeXml(match[1]!))
      continue
    }
    match = trimmed.match(/^<pos>([^<]*)<\/pos>/)
    if (match) {
      pos = decodeXml(match[1]!).replace(/^&(\w+);$/, '$1')
      continue
    }
    match = trimmed.match(/^<gloss(?:\s[^>]*)?>([^<]*)<\/gloss>/)
    if (match)
      glosses.push(decodeXml(match[1]!))
  }
  return out
}

/**
 * FreeDict TEI：按行扫描 `<entry>`，`<orth>` 作词条、`<pron>` 作音标、
 * 仅 `<cit type="trans">` 内的 `<quote>` 作译文（排除例句）。
 */
export function parseFreedictTei(text: string): LocalEntry[] {
  const out: LocalEntry[] = []
  let word = ''
  let pron = ''
  let pos = ''
  let translation = ''
  let inTrans = false
  let seenEntry = false

  const flush = (): void => {
    if (word && translation)
      out.push({ word, phonetic: pron || undefined, partOfSpeech: pos || undefined, translation })
    word = ''
    pron = ''
    pos = ''
    translation = ''
    inTrans = false
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('<entry')) {
      seenEntry = true
      continue
    }
    if (!seenEntry)
      continue
    if (trimmed === '</entry>') {
      flush()
      continue
    }
    if (/^<cit[^>]*type="trans"/.test(trimmed)) {
      inTrans = true
      continue
    }
    if (trimmed === '</cit>') {
      inTrans = false
      continue
    }
    let match = trimmed.match(/^<orth>([^<]*)<\/orth>/)
    if (match) {
      word = decodeXml(match[1]!)
      continue
    }
    match = trimmed.match(/^<pron>([^<]*)<\/pron>/)
    if (match) {
      pron = decodeXml(match[1]!)
      continue
    }
    match = trimmed.match(/^<pos>([^<]*)<\/pos>/)
    if (match) {
      pos = decodeXml(match[1]!)
      continue
    }
    match = trimmed.match(/^<quote>([^<]*)<\/quote>/)
    if (match && inTrans) {
      const value = decodeXml(match[1]!)
      translation = translation ? `${translation}；${value}` : value
    }
  }
  return out
}

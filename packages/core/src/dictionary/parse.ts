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

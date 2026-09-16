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

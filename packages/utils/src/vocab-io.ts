import type { WordEntry } from '@mustard/shared'

const CSV_HEADERS = ['word', 'phonetic', 'partOfSpeech', 'translation', 'sourceLang', 'targetLang', 'streak', 'sourceUrl', 'createdAt'] as const

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function vocabToCsv(entries: WordEntry[]): string {
  const rows = entries.map(e => CSV_HEADERS.map(h => csvCell((e as any)[h])).join(','))
  return [CSV_HEADERS.join(','), ...rows].join('\n')
}

export function vocabToJson(entries: WordEntry[]): string {
  return JSON.stringify(entries, null, 2)
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      }
      else if (ch === '"') {
        quoted = false
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

export function parseVocabCsv(data: string): Partial<WordEntry>[] {
  const lines = data.trim().split(/\r?\n/)
  if (lines.length < 2)
    return []
  const headers = splitCsvLine(lines[0]!)
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitCsvLine(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = cells[i] ?? ''
    })
    return {
      word: obj.word,
      phonetic: obj.phonetic || undefined,
      partOfSpeech: obj.partOfSpeech || undefined,
      translation: obj.translation ?? '',
      sourceLang: (obj.sourceLang as WordEntry['sourceLang']) || 'en',
      targetLang: (obj.targetLang as WordEntry['targetLang']) || 'zh-CN',
      streak: (Number(obj.streak) || 0) as WordEntry['streak'],
      sourceUrl: obj.sourceUrl || undefined,
      createdAt: Number(obj.createdAt) || Date.now(),
    }
  })
}

export function parseVocabJson(data: string): Partial<WordEntry>[] {
  const parsed = JSON.parse(data)
  const list = Array.isArray(parsed) ? parsed : parsed?.words
  if (!Array.isArray(list))
    throw new Error('Invalid vocabulary JSON')
  return list
}

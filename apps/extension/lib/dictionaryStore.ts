import type { LocalEntry } from '@mustard/core/dictionary'
import type { DictInstallStatus, DictionaryItem, DictResult } from '@mustard/shared'
import { createLocalLookup, lemmaCandidates, parseCedictTxt, parseEcdictCsv, parseFreedictTei, parseJmdictXml, parseOpenEcdictTxt, parseWordsetJson } from '@mustard/core/dictionary'
import { idbGet, idbSet } from '@mustard/platform'
import { DICTIONARIES } from '@mustard/shared'

const WORDSET_BASE = 'https://cdn.jsdelivr.net/gh/wordset/wordset-dictionary@master/data'
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')

/** 可下载词典（数据不打包，首次使用时下载） */
export const DICT_PACKS: Record<string, DictionaryItem> = Object.fromEntries(
  DICTIONARIES.filter(d => d.format && (d.url || d.perLetter)).map(d => [d.id, d]),
)

/** 非拉丁文字（中日韩等）按码点分桶，避免全部挤在单个 `_` 分片里 */
const BUCKETS = Array.from({ length: 64 }, (_, i) => `_${i.toString(36)}`)

/** 按词条语言粗筛，避免用中文词典去查英文单词（也避免误触发下载） */
const SCRIPT_RE: Record<string, RegExp> = {
  en: /[a-z]/i,
  zh: /[\u3400-\u9FFF\uF900-\uFAFF]/,
  ja: /[\u3040-\u30FF\u3400-\u9FFF]/,
}

function matchesScript(pack: DictionaryItem, word: string): boolean {
  const re = pack.sourceLang ? SCRIPT_RE[pack.sourceLang] : undefined
  return !re || re.test(word)
}

const progress = new Map<string, number | null>()
const errors = new Map<string, string>()
const installed = new Set<string>()
const shardCache = new Map<string, Map<string, LocalEntry>>()

function shardLetter(word: string): string {
  const ch = word.trim().toLowerCase()[0] ?? '_'
  if (/[a-z]/.test(ch))
    return ch
  const codePoint = ch.codePointAt(0) ?? 0
  return `_${(codePoint % 64).toString(36)}`
}

/** 下载文本；`gzip` 时用 DecompressionStream 解压（浏览器原生支持） */
async function fetchText(url: string, gzip?: boolean): Promise<string> {
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  if (!gzip || !res.body)
    return res.text()
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

function shardKey(id: string, letter: string): string {
  return `dict:${id}:${letter}`
}

function toMap(entries: LocalEntry[]): Map<string, LocalEntry> {
  const map = new Map<string, LocalEntry>()
  for (const entry of entries)
    map.set(entry.word.trim().toLowerCase(), entry)
  return map
}

async function loadShard(id: string, letter: string): Promise<Map<string, LocalEntry> | null> {
  const key = shardKey(id, letter)
  const cached = shardCache.get(key)
  if (cached)
    return cached
  const entries = await idbGet<LocalEntry[]>(key)
  if (!entries || !entries.length)
    return null
  const map = toMap(entries)
  shardCache.set(key, map)
  return map
}

async function storeShards(id: string, entries: LocalEntry[]): Promise<void> {
  const groups = new Map<string, LocalEntry[]>()
  for (const entry of entries) {
    const letter = shardLetter(entry.word)
    const list = groups.get(letter) ?? []
    list.push(entry)
    groups.set(letter, list)
  }
  for (const [letter, list] of groups) {
    await idbSet(shardKey(id, letter), list)
    shardCache.set(shardKey(id, letter), toMap(list))
  }
  installed.add(id)
}

/** 下载单个字母（wordset，首次使用时按需触发） */
async function fetchLetter(id: string, letter: string): Promise<Map<string, LocalEntry> | null> {
  if (!LETTERS.includes(letter))
    return null
  progress.set(id, 0)
  try {
    const res = await fetch(`${WORDSET_BASE}/${letter}.json`)
    if (!res.ok)
      throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    progress.set(id, 0.6)
    const entries = parseWordsetJson(text)
    await idbSet(shardKey(id, letter), entries)
    const map = toMap(entries)
    shardCache.set(shardKey(id, letter), map)
    installed.add(id)
    errors.delete(id)
    return map
  }
  catch (error) {
    errors.set(id, error instanceof Error ? error.message : 'download failed')
    return null
  }
  finally {
    progress.set(id, null)
  }
}

/** 完整安装（ecdict 单文件 / wordset 全字母由调用方决定） */
export async function installDict(id: string): Promise<void> {
  const pack = DICT_PACKS[id]
  if (!pack)
    throw new Error('NO_PACK')
  errors.delete(id)
  progress.set(id, 0)
  try {
    if (!pack.url)
      throw new Error('NO_SOURCE')
    if (pack.format === 'ecdict-csv' || pack.format === 'open-ecdict') {
      const text = await fetchText(pack.url)
      progress.set(id, 0.7)
      await storeShards(id, pack.format === 'open-ecdict' ? parseOpenEcdictTxt(text) : parseEcdictCsv(text))
    }
    else if (pack.format === 'cedict-txt' || pack.format === 'jmdict-xml' || pack.format === 'freedict-tei') {
      const text = await fetchText(pack.url, pack.gzip)
      progress.set(id, 0.7)
      const entries = pack.format === 'cedict-txt'
        ? parseCedictTxt(text)
        : pack.format === 'jmdict-xml'
          ? parseJmdictXml(text)
          : parseFreedictTei(text)
      await storeShards(id, entries)
    }
    else if (pack.format === 'wordset-letters') {
      for (let i = 0; i < LETTERS.length; i++) {
        await fetchLetter(id, LETTERS[i]!)
        progress.set(id, (i + 1) / LETTERS.length)
      }
    }
    else {
      throw new Error('UNKNOWN_FORMAT')
    }
    progress.set(id, 1)
    installed.add(id)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'install failed'
    errors.set(id, message)
    throw error
  }
  finally {
    progress.set(id, null)
  }
}

export async function removeDict(id: string): Promise<void> {
  for (const letter of [...LETTERS, '_', ...BUCKETS]) {
    await idbSet(shardKey(id, letter), [])
    shardCache.delete(shardKey(id, letter))
  }
  installed.delete(id)
  errors.delete(id)
  progress.set(id, null)
}

export function getProgress(id: string): number | null {
  return progress.get(id) ?? null
}

export function getError(id: string): string | undefined {
  return errors.get(id)
}

export function getInstalledIds(): string[] {
  return [...installed]
}

export function isInstalled(id: string): boolean {
  return installed.has(id)
}

/** 设置页状态：结合 settings 的 installed/enabled 与运行时的下载进度 */
export function dictStatus(id: string, enabled: boolean, installedFlag: boolean): DictInstallStatus {
  return {
    id,
    installed: installedFlag || installed.has(id),
    enabled,
    progress: progress.get(id) ?? null,
    error: errors.get(id),
  }
}

/**
 * 本地查询（异步）：命中已缓存分片即返回；未缓存时按需下载。
 * 单词链路：本地（离线词典）→ 在线 → AI。
 */
export async function lookupLocal(enabledIds: string[], word: string, targetLang?: string): Promise<DictResult | null> {
  for (const candidate of lemmaCandidates(word)) {
    const letter = shardLetter(candidate)
    for (const id of enabledIds) {
      const pack = DICT_PACKS[id]
      if (!pack)
        continue
      // 按目标语言筛选：wordset 只提供英文释义，目标非英文时跳过，交给 AI
      if (pack.targetLang && targetLang && pack.targetLang !== targetLang)
        continue
      // 按词条脚本粗筛：中文词典不查英文单词，反之亦然
      if (!matchesScript(pack, candidate))
        continue
      let shard = await loadShard(id, letter)
      if (!shard) {
        if (pack.perLetter) {
          shard = await fetchLetter(id, letter)
        }
        else {
          try {
            await installDict(id)
          }
          catch {
            // 下载失败则跳过，交由在线/AI 兜底
          }
          shard = await loadShard(id, letter)
        }
      }
      if (!shard)
        continue
      const hit = shard.get(candidate)
      if (hit) {
        return {
          word: hit.word,
          phonetic: hit.phonetic,
          partOfSpeech: hit.partOfSpeech,
          translation: hit.translation,
          examples: hit.examples,
          source: `local:${id}`,
        }
      }
    }
  }
  return null
}

/** 兼容旧调用：从若干 y 已缓存词条构造同步查询（测试/工具用） */
export function makeLocalLookup(entries: LocalEntry[]): (word: string) => DictResult | null {
  return createLocalLookup(entries)
}

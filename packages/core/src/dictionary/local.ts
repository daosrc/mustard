import type { DictResult } from '@mustard/shared'

export interface LocalEntry {
  word: string
  phonetic?: string
  partOfSpeech?: string
  translation: string
  examples?: string[]
}

/**
 * 内置 ECDICT 常用词样例（MIT）。
 * 完整 ECDICT（76 万条，裁剪常用 3–6 万词）体积数 MB，需作为扩展资源/按需下载，
 * 待数据源补齐后替换此处（见 docs/PROBLEMS.md「离线词典数据源」）。
 */
export const ECDICT_SAMPLE: LocalEntry[] = [
  { word: 'serendipity', phonetic: '/ˌserənˈdipədi/', partOfSpeech: 'n.', translation: '意外发现美好事物的能力；机缘巧合', examples: ['a serendipitous discovery'] },
  { word: 'ephemeral', phonetic: '/ɪˈfemərəl/', partOfSpeech: 'adj.', translation: '短暂的，转瞬即逝的', examples: ['ephemeral pleasures'] },
  { word: 'fortuitous', phonetic: '/fɔːˈtjuːɪtəs/', partOfSpeech: 'adj.', translation: '偶然发生的；幸运的' },
  { word: 'candid', phonetic: '/ˈkændɪd/', partOfSpeech: 'adj.', translation: '坦率的；直言的', examples: ['a candid interview'] },
  { word: 'nuance', phonetic: '/ˈnjuːɑːns/', partOfSpeech: 'n.', translation: '细微差别' },
  { word: 'resilient', phonetic: '/rɪˈzɪliənt/', partOfSpeech: 'adj.', translation: '有韧性的；恢复力强的' },
  { word: 'ubiquitous', phonetic: '/juːˈbɪkwɪtəs/', partOfSpeech: 'adj.', translation: '无处不在的，普遍存在的' },
  { word: 'pragmatic', phonetic: '/præɡˈmætɪk/', partOfSpeech: 'adj.', translation: '务实的，实用的' },
  { word: 'eloquent', phonetic: '/ˈeləkwənt/', partOfSpeech: 'adj.', translation: '雄辩的；有说服力的' },
  { word: 'ambiguous', phonetic: '/æmˈbɪɡjuəs/', partOfSpeech: 'adj.', translation: '模棱两可的，含糊的' },
  { word: 'meticulous', phonetic: '/məˈtɪkjələs/', partOfSpeech: 'adj.', translation: '一丝不苟的，极仔细的' },
  { word: 'tenacious', phonetic: '/təˈneɪʃəs/', partOfSpeech: 'adj.', translation: '顽强的；坚持不懈的' },
  { word: 'lucid', phonetic: '/ˈluːsɪd/', partOfSpeech: 'adj.', translation: '清晰易懂的；头脑清醒的' },
  { word: 'profound', phonetic: '/prəˈfaʊnd/', partOfSpeech: 'adj.', translation: '深刻的，意义深远的' },
  { word: 'vivid', phonetic: '/ˈvɪvɪd/', partOfSpeech: 'adj.', translation: '生动的，鲜明的' },
  { word: 'subtle', phonetic: '/ˈsʌtl/', partOfSpeech: 'adj.', translation: '微妙的，细微的' },
  { word: 'robust', phonetic: '/rəʊˈbʌst/', partOfSpeech: 'adj.', translation: '强健的；稳固的' },
  { word: 'concise', phonetic: '/kənˈsaɪs/', partOfSpeech: 'adj.', translation: '简明的，简洁的' },
  { word: 'coherent', phonetic: '/kəʊˈhɪərənt/', partOfSpeech: 'adj.', translation: '连贯的，条理清楚的' },
  { word: 'diligent', phonetic: '/ˈdɪlɪdʒənt/', partOfSpeech: 'adj.', translation: '勤勉的，用功的' },
  { word: 'innovative', phonetic: '/ˈɪnəveɪtɪv/', partOfSpeech: 'adj.', translation: '创新的，革新的' },
  { word: 'intuitive', phonetic: '/ɪnˈtjuːɪtɪv/', partOfSpeech: 'adj.', translation: '直觉的；易于理解的' },
  { word: 'feasible', phonetic: '/ˈfiːzəbl/', partOfSpeech: 'adj.', translation: '可行的，办得到的' },
  { word: 'inevitable', phonetic: '/ɪnˈevɪtəbl/', partOfSpeech: 'adj.', translation: '不可避免的' },
  { word: 'diverse', phonetic: '/daɪˈvɜːs/', partOfSpeech: 'adj.', translation: '多种多样的' },
  { word: 'compelling', phonetic: '/kəmˈpelɪŋ/', partOfSpeech: 'adj.', translation: '引人入胜的；令人信服的' },
  { word: 'notorious', phonetic: '/nəʊˈtɔːriəs/', partOfSpeech: 'adj.', translation: '臭名昭著的' },
  { word: 'redundant', phonetic: '/rɪˈdʌndənt/', partOfSpeech: 'adj.', translation: '多余的；被裁员的' },
  { word: 'versatile', phonetic: '/ˈvɜːsətaɪl/', partOfSpeech: 'adj.', translation: '多才多艺的；多用途的' },
  { word: 'transparent', phonetic: '/trænsˈpærənt/', partOfSpeech: 'adj.', translation: '透明的；易懂的' },
  { word: 'consensus', phonetic: '/kənˈsensəs/', partOfSpeech: 'n.', translation: '共识，一致意见' },
  { word: 'paradigm', phonetic: '/ˈpærədaɪm/', partOfSpeech: 'n.', translation: '范式，典范' },
  { word: 'threshold', phonetic: '/ˈθreʃhəʊld/', partOfSpeech: 'n.', translation: '门槛；阈值' },
  { word: 'integrity', phonetic: '/ɪnˈteɡrəti/', partOfSpeech: 'n.', translation: '诚信；完整' },
  { word: 'efficiency', phonetic: '/ɪˈfɪʃnsi/', partOfSpeech: 'n.', translation: '效率，功效' },
  { word: 'insight', phonetic: '/ˈɪnsaɪt/', partOfSpeech: 'n.', translation: '洞察力；深刻见解' },
  { word: 'empathy', phonetic: '/ˈempəθi/', partOfSpeech: 'n.', translation: '同理心，共情' },
  { word: 'momentum', phonetic: '/məˈmentəm/', partOfSpeech: 'n.', translation: '动量；势头' },
  { word: 'run', phonetic: '/rʌn/', partOfSpeech: 'v.', translation: '跑；运行；经营', examples: ['run a marathon'] },
  { word: 'give', phonetic: '/ɡɪv/', partOfSpeech: 'v.', translation: '给；提供', examples: ['give a hand'] },
  { word: 'make', phonetic: '/meɪk/', partOfSpeech: 'v.', translation: '做；制造；使得' },
  { word: 'study', phonetic: '/ˈstʌdi/', partOfSpeech: 'v./n.', translation: '学习；研究' },
  { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', partOfSpeech: 'adj.', translation: '美丽的，漂亮的' },
  { word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/', partOfSpeech: 'n.', translation: '语言' },
  { word: 'translate', phonetic: '/trænzˈleɪt/', partOfSpeech: 'v.', translation: '翻译；转化' },
]

/** 轻量词形还原候选（不做完整 NLP；ECDICT 的 exchange/lemma 在 M10 可替换） */
export function lemmaCandidates(raw: string): string[] {
  const word = raw.trim().toLowerCase()
  if (!word)
    return []
  const out = new Set<string>([word])
  const add = (value: string): void => {
    if (value.length >= 2)
      out.add(value)
  }
  if (word.endsWith('ies'))
    add(`${word.slice(0, -3)}y`)
  if (word.endsWith('es'))
    add(word.slice(0, -2))
  if (word.endsWith('s') && !word.endsWith('ss'))
    add(word.slice(0, -1))
  if (word.endsWith('ing'))
    add(word.slice(0, -3))
  if (word.endsWith('ing'))
    add(`${word.slice(0, -3)}e`)
  if (word.endsWith('ed'))
    add(word.slice(0, -2))
  if (word.endsWith('ed'))
    add(word.slice(0, -1))
  if (word.endsWith('er'))
    add(word.slice(0, -2))
  if (word.endsWith('est'))
    add(word.slice(0, -3))
  return [...out]
}

/** 用一组词条构造本地查询函数（多词典可合并词条后共用） */
export function createLocalLookup(entries: LocalEntry[]): (word: string) => DictResult | null {
  const index = new Map<string, LocalEntry>()
  for (const entry of entries)
    index.set(entry.word.trim().toLowerCase(), entry)

  return (word: string): DictResult | null => {
    for (const candidate of lemmaCandidates(word)) {
      const hit = index.get(candidate)
      if (hit) {
        return {
          word: hit.word,
          phonetic: hit.phonetic,
          partOfSpeech: hit.partOfSpeech,
          translation: hit.translation,
          examples: hit.examples,
          source: 'local',
        }
      }
    }
    return null
  }
}

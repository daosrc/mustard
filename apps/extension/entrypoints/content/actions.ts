import type { TranslateResult } from '@mustard/core/translation'
import type { LangCode, Settings, WordEntry } from '@mustard/shared'
import { cardToEntry } from '@mustard/core/vocab'
import { send } from '@mustard/platform'
import { speak } from '../../lib/speech'

export function isWord(text: string): boolean {
  return /^\p{L}[\p{L}'-]*$/u.test(text.trim())
}

export async function translate(text: string, settings: Settings | null): Promise<TranslateResult> {
  return send({
    type: 'TRANSLATE_TEXT',
    payload: {
      text,
      sourceLang: settings?.sourceLang ?? 'auto',
      targetLang: settings?.targetLang ?? 'zh-CN',
      mode: isWord(text) ? 'word' : 'sentence',
    },
  })
}

function resolveSourceLang(text: string, settings: Settings | null): LangCode {
  const source = settings?.sourceLang
  if (source && source !== 'auto')
    return source
  return /^[\x20-\x7E]+$/.test(text) ? 'en' : (settings?.targetLang ?? 'zh-CN')
}

export async function addToVocab(text: string, result: TranslateResult, settings: Settings | null): Promise<WordEntry> {
  const card = result.card
  return send({
    type: 'ADD_VOCAB',
    payload: cardToEntry({
      word: card?.word ?? text,
      translation: card?.translation ?? result.text,
      phonetic: card?.phonetic,
      partOfSpeech: card?.partOfSpeech,
      examples: card?.examples,
      sourceLang: resolveSourceLang(card?.word ?? text, settings),
      targetLang: (settings?.targetLang ?? 'zh-CN') as LangCode,
      sourceUrl: location.href,
    }),
  })
}

export function speakText(text: string, settings: Settings | null): void {
  speak(text, resolveSourceLang(text, settings))
}

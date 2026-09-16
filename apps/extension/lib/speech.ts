import type { LangCode } from '@mustard/shared'
import { langBcp47 } from '@mustard/shared'

/** Web Speech API 朗读（后续可换词典音频） */
export function speak(text: string, lang: LangCode = 'en'): void {
  if (typeof speechSynthesis === 'undefined' || !text.trim())
    return
  speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = langBcp47(lang)
  speechSynthesis.speak(utterance)
}

import type { AiTarget } from '@mustard/core'
import type { ChatPortClientMessage, LangCode, Message, Settings, SourceLang } from '@mustard/shared'
import { cardToEntry, chatOnce, chatStream, errorCode, lookupWord, translateImage, translateSentence, translateWord } from '@mustard/core'
import { getSettings, openSidePanel, setStored, updateSettings } from '@mustard/platform'
import { CHAT_PORT_NAME, ERR_MISSING_API_KEY, STORAGE_KEYS } from '@mustard/shared'
import { parseVocabCsv, parseVocabJson, vocabToCsv, vocabToJson } from '@mustard/utils'
import { browser } from 'wxt/browser'
import { defineBackground } from '#imports'
import { getLocalLookup } from '../lib/dictionaryStore'
import { deleteSession, getSessions, saveSession } from '../lib/sessionStore'
import { addVocab, getVocab, importVocab, removeVocabById } from '../lib/vocabStore'

function resolveAi(settings: Settings): AiTarget | undefined {
  const provider = settings.providers.find(p => p.id === settings.activeProviderId)
  const model = provider?.models.find(m => m.name === settings.activeModel)
  if (!provider || !model || !provider.apiKey)
    return undefined
  return { provider, model }
}

function resolveSourceLang(sourceLang: SourceLang, word: string, targetLang: LangCode): LangCode {
  if (sourceLang !== 'auto')
    return sourceLang
  return /^[\x20-\x7E]+$/.test(word) ? 'en' : targetLang
}

export default defineBackground({
  type: 'module',
  main() {
    // 点击工具栏图标时打开侧边栏
    ;(browser as any).sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true })?.catch?.(() => {})

    browser.runtime.onMessage.addListener((raw, sender) => {
      const message = raw as Message
      switch (message.type) {
        case 'PING':
          return Promise.resolve({ ok: true })
        case 'GET_SETTINGS':
          return getSettings()
        case 'UPDATE_SETTINGS':
          return updateSettings(message.payload)
        case 'OPEN_SIDEBAR': {
          const view = message.payload?.view
          return (async () => {
            if (view)
              await setStored(STORAGE_KEYS.pendingView, view)
            await openSidePanel((sender as any)?.tab?.id)
            return { ok: true }
          })()
        }
        case 'TRANSLATE_TEXT': {
          const { text, sourceLang, targetLang, mode } = message.payload
          return (async () => {
            const settings = await getSettings()
            const ai = resolveAi(settings)
            if (mode === 'word') {
              const enabledDicts = Object.entries(settings.dictionaries)
                .filter(([, state]) => state.installed && state.enabled)
                .map(([id]) => id)
              const local = await getLocalLookup(enabledDicts)
              const result = await translateWord(text, sourceLang, targetLang, { online: settings.onlineDictionaryFallback, ai, local })
              if (result.card && settings.vocab.autoAdd) {
                await addVocab(cardToEntry({
                  ...result.card,
                  word: result.card.word,
                  translation: result.card.translation,
                  sourceLang: resolveSourceLang(sourceLang, result.card.word, targetLang),
                  targetLang,
                  sourceUrl: (sender as any)?.tab?.url,
                }))
              }
              return result
            }
            return translateSentence(text, sourceLang, targetLang, ai)
          })()
        }
        case 'LOOKUP_WORD':
          return lookupWord(message.payload.word, message.payload.targetLang)
        case 'TRANSLATE_IMAGE': {
          const { dataUrl, targetLang } = message.payload
          return (async () => {
            const ai = resolveAi(await getSettings())
            if (!ai)
              throw new Error(ERR_MISSING_API_KEY)
            return { content: await translateImage(dataUrl, targetLang, ai) }
          })()
        }
        case 'CAPTURE_TAB':
          return (async () => {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
            const dataUrl = tab?.windowId !== undefined
              ? await browser.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
              : await browser.tabs.captureVisibleTab({ format: 'png' })
            return { dataUrl }
          })()
        case 'GET_VOCAB':
          return getVocab()
        case 'ADD_VOCAB':
          return addVocab(message.payload)
        case 'REMOVE_VOCAB':
          return (async () => {
            await removeVocabById(message.payload.id)
            return { id: message.payload.id }
          })()
        case 'EXPORT_VOCAB':
          return (async () => {
            const entries = await getVocab()
            const stamp = new Date().toISOString().slice(0, 10)
            if (message.payload.format === 'csv')
              return { data: vocabToCsv(entries), filename: `mustard-vocab-${stamp}.csv` }
            return { data: vocabToJson(entries), filename: `mustard-vocab-${stamp}.json` }
          })()
        case 'IMPORT_VOCAB':
          return (async () => {
            const incoming = message.payload.format === 'csv'
              ? parseVocabCsv(message.payload.data)
              : parseVocabJson(message.payload.data)
            return importVocab(incoming)
          })()
        case 'GET_SESSIONS':
          return getSessions()
        case 'SAVE_SESSION':
          return saveSession(message.payload.session)
        case 'DELETE_SESSION':
          return (async () => {
            await deleteSession(message.payload.id)
            return { id: message.payload.id }
          })()
        case 'CHAT': {
          const { messages, providerId, model } = message.payload
          return (async () => {
            const settings = await getSettings()
            const provider = settings.providers.find(p => p.id === providerId)
            const modelDef = provider?.models.find(m => m.name === model)
            if (!provider || !modelDef)
              throw new Error('MODEL_NOT_FOUND')
            return { content: await chatOnce(provider, modelDef, messages) }
          })()
        }
        default:
          return Promise.resolve(null)
      }
    })

    // 流式对话：长连接端口
    browser.runtime.onConnect.addListener((port) => {
      if (port.name !== CHAT_PORT_NAME)
        return
      let controller: AbortController | null = null

      port.onMessage.addListener((raw) => {
        const message = raw as ChatPortClientMessage
        if (message.type === 'CHAT_ABORT') {
          controller?.abort()
          return
        }
        if (message.type !== 'CHAT_START')
          return

        const { messages, providerId, model } = message.payload
        void (async () => {
          const settings = await getSettings()
          const provider = settings.providers.find(p => p.id === providerId)
          const modelDef = provider?.models.find(m => m.name === model)
          if (!provider || !modelDef) {
            port.postMessage({ type: 'CHAT_ERROR', code: 'MODEL_NOT_FOUND', message: '未找到所选模型' })
            return
          }
          if (!provider.apiKey) {
            port.postMessage({ type: 'CHAT_ERROR', code: ERR_MISSING_API_KEY, message: '尚未配置 API Key' })
            return
          }
          controller = new AbortController()
          let content = ''
          try {
            for await (const chunk of chatStream(provider, modelDef, messages, controller.signal)) {
              content += chunk.delta
              port.postMessage({ type: 'CHAT_DELTA', delta: chunk.delta })
            }
            port.postMessage({ type: 'CHAT_DONE', content })
          }
          catch (error) {
            port.postMessage({ type: 'CHAT_ERROR', code: errorCode(error), message: errorCode(error) })
          }
        })()
      })

      port.onDisconnect.addListener(() => controller?.abort())
    })
  },
})

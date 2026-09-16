import type { AiTarget } from '@mustard/core'
import type { ChatPortClientMessage, DictResult, LangCode, Message, Settings, SourceLang } from '@mustard/shared'
import { cardToEntry, chatOnce, chatStream, errorCode, lookupWord, translateImage, translateSentence, translateWord } from '@mustard/core'
import { getSettings, openSidePanel, setStored, updateSettings } from '@mustard/platform'
import { CHAT_PORT_NAME, ERR_MISSING_API_KEY, STORAGE_KEYS } from '@mustard/shared'
import { cacheKey, parseVocabCsv, parseVocabJson, vocabToCsv, vocabToJson } from '@mustard/utils'
import { browser } from 'wxt/browser'
import { defineBackground } from '#imports'
import { getLocalLookup } from '../lib/dictionaryStore'
import { deleteSession, getSessions, saveSession } from '../lib/sessionStore'
import { getCached, setCached } from '../lib/translationCache'
import { addVocab, getVocab, importVocab, removeVocabById, updateVocab } from '../lib/vocabStore'

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

async function buildLocalLookup(): Promise<(word: string) => DictResult | null> {
  const settings = await getSettings()
  const enabled = Object.entries(settings.dictionaries)
    .filter(([, state]) => state.installed && state.enabled)
    .map(([id]) => id)
  return getLocalLookup(enabled)
}

async function addSelectionToVocab(text: string, url?: string): Promise<void> {
  const settings = await getSettings()
  const local = await buildLocalLookup()
  const result = await translateWord(text, 'auto', settings.targetLang, {
    online: settings.onlineDictionaryFallback,
    ai: resolveAi(settings),
    local,
  })
  if (!result.card && !result.text)
    return
  await addVocab(cardToEntry({
    word: result.card?.word ?? text,
    translation: result.card?.translation ?? result.text,
    phonetic: result.card?.phonetic,
    partOfSpeech: result.card?.partOfSpeech,
    examples: result.card?.examples,
    sourceLang: resolveSourceLang('auto', text, settings.targetLang),
    targetLang: settings.targetLang,
    sourceUrl: url,
  }))
}

function setupContextMenus(): void {
  const menus = browser.contextMenus
  if (!menus)
    return
  menus.removeAll(() => {
    menus.create({ id: 'mustard-translate', title: '用 Mustard 翻译「%s」', contexts: ['selection'] })
    menus.create({ id: 'mustard-add-vocab', title: '加入 Mustard 生词本「%s」', contexts: ['selection'] })
  })
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
            const key = cacheKey(mode, text, sourceLang, targetLang)
            const cached = await getCached(key)
            if (cached)
              return cached

            let result
            if (mode === 'word') {
              result = await translateWord(text, sourceLang, targetLang, {
                online: settings.onlineDictionaryFallback,
                ai,
                local: await buildLocalLookup(),
              })
              if (result.card && settings.vocab.autoAdd) {
                await addVocab(cardToEntry({
                  word: result.card.word,
                  translation: result.card.translation,
                  phonetic: result.card.phonetic,
                  partOfSpeech: result.card.partOfSpeech,
                  examples: result.card.examples,
                  sourceLang: resolveSourceLang(sourceLang, result.card.word, targetLang),
                  targetLang,
                  sourceUrl: (sender as any)?.tab?.url,
                }))
              }
            }
            else {
              result = await translateSentence(text, sourceLang, targetLang, ai)
            }
            if (result.text)
              await setCached(key, result)
            return result
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
        case 'UPDATE_VOCAB':
          return updateVocab(message.payload)
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

    // 快捷键（manifest.commands：Alt+T 切网页翻译 / Alt+L 开侧边栏）
    browser.commands?.onCommand.addListener((command) => {
      if (command === 'open-sidebar') {
        void openSidePanel()
        return
      }
      if (command === 'toggle-page-translate') {
        void (async () => {
          const settings = await getSettings()
          await updateSettings({ features: { ...settings.features, pageTranslate: !settings.features.pageTranslate } })
        })()
      }
    })

    // 右键菜单：翻译选中文本 / 加入生词本
    setupContextMenus()
    browser.contextMenus?.onClicked.addListener((info, tab) => {
      const text = (info.selectionText ?? '').trim()
      if (!text)
        return
      if (info.menuItemId === 'mustard-translate') {
        void (async () => {
          await setStored(STORAGE_KEYS.pendingCompose, text)
          await openSidePanel(tab?.id)
        })()
      }
      else if (info.menuItemId === 'mustard-add-vocab') {
        void addSelectionToVocab(text, tab?.url)
      }
    })
  },
})

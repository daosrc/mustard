import type { AiTarget } from '@mustard/core'
import type { ChatPortClientMessage, DictResult, LangCode, Message, Settings, SourceLang } from '@mustard/shared'
import { cardToEntry, chatOnce, chatStream, errorCode, IDENTITY_REPLY, isIdentityQuery, lookupWord, translateImage, translateSentence, translateWord, withSystemPrompt } from '@mustard/core'
import { getSettings, openSidePanel, setStored, updateSettings } from '@mustard/platform'
import { CHAT_PORT_NAME, DICTIONARIES, ERR_MISSING_API_KEY, STORAGE_KEYS } from '@mustard/shared'
import { cacheKey, parseVocabCsv, parseVocabJson, vocabToCsv, vocabToJson } from '@mustard/utils'
import { browser } from 'wxt/browser'
import { defineBackground } from '#imports'
import { dictStatus, getInstalledIds, installDict, lookupLocal, removeDict } from '../lib/dictionaryStore'
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

/** 主模型 + 同提供商其他支持文本的模型（主模型 429 时依次回退） */
function resolveAiList(settings: Settings): AiTarget[] {
  const provider = settings.providers.find(p => p.id === settings.activeProviderId)
  if (!provider?.apiKey)
    return []
  const active = provider.models.find(m => m.name === settings.activeModel)
  const others = provider.models.filter(m => m.name !== settings.activeModel && m.inputs.text)
  return [active, ...others]
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map(model => ({ provider, model }))
}

function resolveSourceLang(sourceLang: SourceLang, word: string, targetLang: LangCode): LangCode {
  if (sourceLang !== 'auto')
    return sourceLang
  return /^[\x20-\x7E]+$/.test(word) ? 'en' : targetLang
}

async function localLookupFn(targetLang?: string): Promise<(word: string) => Promise<DictResult | null>> {
  const settings = await getSettings()
  const enabled = Object.entries(settings.dictionaries)
    .filter(([, state]) => state.enabled)
    .map(([id]) => id)
  return (word: string) => lookupLocal(enabled, word, targetLang ?? settings.targetLang)
}

/** 不按目标语言筛选的本地查询（AI 未命中时的兜底） */
async function localFallbackFn(): Promise<(word: string) => Promise<DictResult | null>> {
  const settings = await getSettings()
  const enabled = Object.entries(settings.dictionaries)
    .filter(([, state]) => state.enabled)
    .map(([id]) => id)
  return (word: string) => lookupLocal(enabled, word)
}

/** 下载完成后把 installed 状态写回 settings（设置页据此展示） */
async function syncDictSettings(): Promise<void> {
  const installedIds = getInstalledIds()
  if (!installedIds.length)
    return
  const settings = await getSettings()
  const dictionaries = { ...settings.dictionaries }
  let changed = false
  for (const id of installedIds) {
    const current = dictionaries[id]
    if (current && !current.installed) {
      dictionaries[id] = { ...current, installed: true }
      changed = true
    }
  }
  if (changed)
    await updateSettings({ dictionaries })
}

async function addSelectionToVocab(text: string, url?: string): Promise<void> {
  const settings = await getSettings()
  const local = await localLookupFn(settings.targetLang)
  const result = await translateWord(text, 'auto', settings.targetLang, {
    online: settings.onlineDictionaryFallback,
    ai: resolveAi(settings),
    local,
  })
  void syncDictSettings()
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
          // 必须**先**调用 sidePanel.open（保留用户手势上下文），再写 pendingView；
          // 若先 await 存储会丢失手势，导致 sidePanel.open 被 Chrome 拒绝。
          const opened = openSidePanel((sender as any)?.tab?.id)
          if (view)
            void setStored(STORAGE_KEYS.pendingView, view)
          return opened.then(() => ({ ok: true }))
        }
        case 'TRANSLATE_TEXT': {
          const { text, sourceLang, targetLang, mode } = message.payload
          return (async () => {
            const settings = await getSettings()
            const key = cacheKey(mode, text, sourceLang, targetLang)
            const cached = await getCached(key)
            if (cached)
              return cached

            let result
            if (mode === 'word') {
              const aiList = resolveAiList(settings)
              result = await translateWord(text, sourceLang, targetLang, {
                online: settings.onlineDictionaryFallback,
                ai: aiList[0],
                aiFallbacks: aiList.slice(1),
                local: await localLookupFn(targetLang),
                localFallback: await localFallbackFn(),
              })
              void syncDictSettings()
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
              const aiList = resolveAiList(settings)
              result = await translateSentence(text, sourceLang, targetLang, aiList[0], aiList.slice(1))
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
        case 'GET_DICT_STATUS':
          return (async () => {
            const settings = await getSettings()
            return DICTIONARIES.map(d => dictStatus(
              d.id,
              settings.dictionaries[d.id]?.enabled ?? false,
              settings.dictionaries[d.id]?.installed ?? false,
            ))
          })()
        case 'DICT_INSTALL':
          return (async () => {
            try {
              await installDict(message.payload.id)
              await syncDictSettings()
              return { id: message.payload.id, ok: true }
            }
            catch (error) {
              return { id: message.payload.id, ok: false, error: errorCode(error) }
            }
          })()
        case 'DICT_REMOVE':
          return (async () => {
            await removeDict(message.payload.id)
            const settings = await getSettings()
            if (settings.dictionaries[message.payload.id])
              await updateSettings({ dictionaries: { ...settings.dictionaries, [message.payload.id]: { installed: false, enabled: false } } })
            return { id: message.payload.id }
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
            const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
            if (isIdentityQuery(lastUser))
              return { content: IDENTITY_REPLY }

            const list = resolveAiList(settings)
            let lastError: unknown
            for (const target of (list.length ? list : [{ provider, model: modelDef }])) {
              try {
                return { content: await chatOnce(target.provider, target.model, withSystemPrompt(messages)) }
              }
              catch (error) {
                lastError = error
              }
            }
            throw lastError ?? new Error('CHAT_FAILED')
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
          const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''
          if (isIdentityQuery(lastUser)) {
            port.postMessage({ type: 'CHAT_DONE', content: IDENTITY_REPLY })
            return
          }
          controller = new AbortController()
          let content = ''
          try {
            for await (const chunk of chatStream(provider, modelDef, withSystemPrompt(messages), controller.signal)) {
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

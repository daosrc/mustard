import type { Settings } from '@mustard/shared'
import { send } from '@mustard/platform'
import { reactive } from 'vue'

/** 网页翻译状态（顶部浮条用） */
export const pageState = reactive({
  active: false,
  done: 0,
  total: 0,
  ok: 0,
  failed: 0,
})

const MARK = 'data-mustard-translated'
const CLS = 'mustard-translation'
const STYLE_ID = 'mustard-page-translation-style'
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt, summary, caption, div'
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'SVG', 'CANVAS', 'IFRAME'])
const MAX_BLOCKS = 600
/**
 * 每次请求尽量带上整页文本：正常文章 1~2 次请求即可翻完；
 * 只有超出上限或模型返回不完整时，core 才会二分拆小、最终单条重试。
 */
const MAX_CHARS_PER_REQUEST = 10000
const MAX_BLOCKS_PER_REQUEST = 80
const RETRY = 1

let observer: MutationObserver | null = null
let scanTimer: ReturnType<typeof setTimeout> | undefined
let queue: HTMLElement[] = []
let busy = false
let totalQueued = 0
let settingsRef: Settings | null = null
let queued = new WeakSet<HTMLElement>()
/** 短文本阈值：不超过该长度时译文与原文本行内并列 */
const INLINE_MAX = 30

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** 追加译文节点的样式必须注入到页面（content.css 只作用于 Shadow DOM） */
function ensurePageStyle(): void {
  if (document.getElementById(STYLE_ID))
    return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.${CLS} {
  margin: .25em 0 .6em;
  padding: .3em .6em;
  border-left: 3px solid #7ABE3E;
  background: rgba(122, 190, 62, .08);
  color: #5b6b4f;
  font-size: .95em;
  line-height: 1.65;
  border-radius: 0 6px 6px 0;
}
.${CLS}.is-inline {
  display: inline;
  margin: 0 0 0 .5em;
  padding: 0 .4em;
  border-left: 2px solid #7ABE3E;
  border-radius: 0 4px 4px 0;
  font-size: .92em;
  white-space: nowrap;
}
`
  document.head.appendChild(style)
}

function isCandidate(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName) || el.isContentEditable)
    return false
  // 内含 style/script 的块（如 Wikipedia 的 navbox-styles）：textContent 会混入 CSS
  if (el.querySelector('style, script, noscript, template, link'))
    return false
  if (el.closest('mustard-root') || el.closest(`.${CLS}`))
    return false
  if (el.hasAttribute(MARK) || queued.has(el) || !el.getClientRects().length)
    return false
  // 已经在其后追加过译文节点
  if (el.nextElementSibling?.classList.contains(CLS))
    return false
  const text = (el.textContent ?? '').trim()
  if (text.length < 2 || !/\p{L}/u.test(text))
    return false
  // 只取「叶子块」：内部不再有带文本的块级元素，避免重复翻译
  for (const child of el.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if ((child.textContent ?? '').trim().length >= 2)
      return false
  }
  return true
}

/** 扫描并标记（标记即刻生效，防止 MutationObserver 重扫造成重复） */
function collect(): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const el of document.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (out.length >= MAX_BLOCKS)
      break
    if (isCandidate(el)) {
      el.setAttribute(MARK, '1')
      queued.add(el)
      out.push(el)
    }
  }
  return out
}

/** 同行是否放得下：换行或右侧溢出即视为放不下 */
function inlineFits(el: HTMLElement, span: HTMLElement): boolean {
  const sr = span.getBoundingClientRect()
  if (!sr.width && !sr.height)
    return true
  const display = getComputedStyle(el).display
  const limit = (display.startsWith('inline')
    ? el.parentElement?.getBoundingClientRect().right
    : el.getBoundingClientRect().right) ?? sr.right
  const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight)
  const singleLine = !lineHeight || sr.height <= lineHeight * 1.5
  return singleLine && sr.right <= limit + 1
}

function appendBelow(el: HTMLElement, text: string): void {
  const node = document.createElement('div')
  node.className = CLS
  node.textContent = text
  // 表格单元格内不能直接 after（会被挪出表格），改为追加到单元格内部
  if (el.tagName === 'TD' || el.tagName === 'TH')
    el.appendChild(node)
  else
    el.after(node)
}

/** 空间够就接在原文同行，放不下则追加到原文下方 */
function insertTranslation(el: HTMLElement, original: string, text: string): void {
  if (original.length > INLINE_MAX) {
    appendBelow(el, text)
    return
  }
  const span = document.createElement('span')
  span.className = `${CLS} is-inline`
  span.textContent = text
  el.appendChild(span)
  if (inlineFits(el, span))
    return
  span.remove()
  appendBelow(el, text)
}

function takeBatch(): { els: HTMLElement[], texts: string[] } {
  const els: HTMLElement[] = []
  const texts: string[] = []
  let chars = 0
  while (queue.length && els.length < MAX_BLOCKS_PER_REQUEST) {
    const el = queue[0]!
    const text = (el.textContent ?? '').trim()
    if (els.length && chars + text.length > MAX_CHARS_PER_REQUEST)
      break
    queue.shift()
    els.push(el)
    texts.push(text)
    chars += text.length
  }
  return { els, texts }
}

async function translateBatch(texts: string[]): Promise<string[]> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const res = await send({
        type: 'TRANSLATE_BLOCKS',
        payload: {
          texts,
          sourceLang: settingsRef?.sourceLang ?? 'auto',
          targetLang: settingsRef?.targetLang ?? 'zh-CN',
        },
      })
      if (res.texts.some(Boolean))
        return res.texts
    }
    catch (error) {
      lastError = error
    }
    if (attempt < RETRY)
      await sleep(800 * (attempt + 1))
  }
  if (lastError)
    console.warn('[mustard] page translate batch failed', lastError)
  return texts.map(() => '')
}

async function run(): Promise<void> {
  if (busy)
    return
  busy = true
  try {
    while (pageState.active && queue.length) {
      const { els, texts } = takeBatch()
      const results = await translateBatch(texts)
      els.forEach((el, i) => {
        // 保留 MARK：避免 MutationObserver 因我们插入的节点而重扫造成重复翻译
        pageState.done++
        const text = results[i]?.trim()
        if (text) {
          insertTranslation(el, texts[i]!, text)
          pageState.ok++
        }
        else {
          pageState.failed++
        }
      })
      await sleep(300)
    }
  }
  finally {
    busy = false
  }
}

function enqueue(blocks: HTMLElement[]): void {
  if (!blocks.length)
    return
  queue.push(...blocks)
  totalQueued += blocks.length
  pageState.total = totalQueued
  void run()
}

function scheduleScan(): void {
  clearTimeout(scanTimer)
  scanTimer = setTimeout(() => {
    if (pageState.active)
      enqueue(collect())
  }, 500)
}

export function setPageSettings(settings: Settings | null): void {
  settingsRef = settings
}

export function startPageTranslate(settings: Settings | null): void {
  settingsRef = settings
  if (pageState.active)
    return
  ensurePageStyle()
  pageState.active = true
  pageState.done = 0
  pageState.total = 0
  pageState.ok = 0
  pageState.failed = 0
  queue = []
  busy = false
  totalQueued = 0
  enqueue(collect())
  observer = new MutationObserver(scheduleScan)
  observer.observe(document.body, { childList: true, subtree: true })
}

export function stopPageTranslate(): void {
  pageState.active = false
  observer?.disconnect()
  observer = null
  clearTimeout(scanTimer)
  queue = []
  busy = false
  totalQueued = 0
  queued = new WeakSet<HTMLElement>() // 重置去重集合，允许再次翻译
  document.querySelectorAll(`.${CLS}`).forEach(node => node.remove())
  document.querySelectorAll(`[${MARK}]`).forEach(el => el.removeAttribute(MARK))
  pageState.done = 0
  pageState.total = 0
  pageState.ok = 0
  pageState.failed = 0
}

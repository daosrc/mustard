import type { Settings } from '@mustard/shared'
import { send } from '@mustard/platform'
import { reactive } from 'vue'

/** 网页翻译状态（顶部浮条用） */
export const pageState = reactive({
  active: false,
  done: 0,
  total: 0,
  ok: 0,
})

const MARK = 'data-mustard-translated'
const CLS = 'mustard-translation'
const STYLE_ID = 'mustard-page-translation-style'
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dd, dt, summary, caption, div'
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'SVG', 'CANVAS', 'IFRAME'])
const MAX_BLOCKS = 600
const CONCURRENCY = 3

let observer: MutationObserver | null = null
let scanTimer: ReturnType<typeof setTimeout> | undefined
let queue: HTMLElement[] = []
let running = 0
let totalQueued = 0
let settingsRef: Settings | null = null
const queued = new WeakSet<HTMLElement>()

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
.mustard-skeleton {
  display: inline-block;
  width: 64px;
  height: 1em;
  border-radius: 4px;
  background: linear-gradient(90deg, #eef6e6 25%, #dbe9cd 37%, #eef6e6 63%);
  background-size: 400% 100%;
  animation: mustard-shimmer 1.4s ease infinite;
  vertical-align: text-bottom;
}
@keyframes mustard-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
`
  document.head.appendChild(style)
}

function isCandidate(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName) || el.isContentEditable)
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

async function translateBlock(el: HTMLElement): Promise<void> {
  const node = document.createElement('div')
  node.className = CLS
  node.innerHTML = '<span class="mustard-skeleton"></span>'
  el.after(node)
  try {
    const text = (el.textContent ?? '').trim()
    const result = await send({
      type: 'TRANSLATE_TEXT',
      payload: {
        text,
        sourceLang: settingsRef?.sourceLang ?? 'auto',
        targetLang: settingsRef?.targetLang ?? 'zh-CN',
        mode: 'page',
      },
    })
    if (result.text) {
      node.textContent = result.text
      pageState.ok++
    }
    else {
      node.remove()
    }
  }
  catch {
    node.remove()
  }
}

function pump(): void {
  while (running < CONCURRENCY && queue.length) {
    const el = queue.shift()!
    running++
    void translateBlock(el).finally(() => {
      running--
      pageState.done++
      pump()
    })
  }
}

function enqueue(blocks: HTMLElement[]): void {
  if (!blocks.length)
    return
  queue.push(...blocks)
  totalQueued += blocks.length
  pageState.total = totalQueued
  pump()
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
  queue = []
  running = 0
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
  running = 0
  totalQueued = 0
  document.querySelectorAll(`.${CLS}`).forEach(node => node.remove())
  document.querySelectorAll(`[${MARK}]`).forEach(el => el.removeAttribute(MARK))
  pageState.done = 0
  pageState.total = 0
  pageState.ok = 0
}

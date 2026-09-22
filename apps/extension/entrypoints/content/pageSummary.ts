import type { PageContent } from '@mustard/shared'

/** 视为「页面框架」的区域：导航/页脚/侧栏/表单等，总结时全部忽略 */
const SKIP_SELECTOR = 'nav, header, footer, aside, form, [role="navigation"], [aria-hidden="true"], .navbox, .metadata, .mw-editsection'
const BLOCK_SELECTOR = 'p, li, h2, h3, h4, blockquote, dd, td'
/** 短于该长度的块多为标题/导航项/标签，按「忽略标题等无关信息」跳过 */
const MIN_BLOCK_LEN = 24

/**
 * 抽取网页主要内容：优先 article / main / [role=main]，退化为 body；
 * 只取正文段落类块，忽略导航、页脚、侧栏与短标题，去重并截断到 maxChars。
 */
export function extractMainContent(maxChars = 6000): PageContent {
  const root = document.querySelector<HTMLElement>('article')
    ?? document.querySelector<HTMLElement>('main')
    ?? document.querySelector<HTMLElement>('[role="main"]')
    ?? document.body

  const parts: string[] = []
  const seen = new Set<string>()
  let total = 0

  for (const el of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    if (el.closest(SKIP_SELECTOR))
      continue
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.length < MIN_BLOCK_LEN || seen.has(text))
      continue
    seen.add(text)
    parts.push(text)
    total += text.length
    if (total >= maxChars)
      break
  }

  return {
    title: document.title,
    text: parts.join('\n'),
    url: location.href,
    ts: Date.now(),
  }
}

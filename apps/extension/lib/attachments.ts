/**
 * 附件文本抽取：文本/Markdown 直接读；DOCX 解压 word/document.xml；
 * PDF 尽力抽取文本层（无法处理扫描件）。
 * 仅依赖浏览器原生能力（DecompressionStream / TextDecoder），零第三方库。
 */

function readU16(d: Uint8Array, o: number): number {
  return d[o]! | (d[o + 1]! << 8)
}

function readU32(d: Uint8Array, o: number): number {
  return (d[o]! | (d[o + 1]! << 8) | (d[o + 2]! << 16) | (d[o + 3]! << 24)) >>> 0
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  // PDF / zip 用 raw DEFLATE；部分实现会带 2 字节 zlib 头，两种都试
  for (const format of ['deflate-raw', 'deflate'] as const) {
    try {
      const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream(format))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    }
    catch {
      // 换下一种格式
    }
  }
  return bytes
}

const decoder = new TextDecoder()

/** 从 zip 里按文件名读出一个条目（DOCX 是 zip 结构） */
async function readZipEntry(data: Uint8Array, name: string): Promise<string | null> {
  let eocd = -1
  for (let i = data.length - 22; i >= 0; i--) {
    if (data[i] === 0x50 && data[i + 1] === 0x4B && data[i + 2] === 0x05 && data[i + 3] === 0x06) {
      eocd = i
      break
    }
  }
  if (eocd < 0)
    return null

  const count = readU16(data, eocd + 10)
  let offset = readU32(data, eocd + 16)
  for (let i = 0; i < count; i++) {
    if (readU32(data, offset) !== 0x02014B50)
      break
    const method = readU16(data, offset + 10)
    const compSize = readU32(data, offset + 20)
    const nameLen = readU16(data, offset + 28)
    const extraLen = readU16(data, offset + 30)
    const commentLen = readU16(data, offset + 32)
    const localOff = readU32(data, offset + 42)
    const entryName = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLen))
    if (entryName === name) {
      const lNameLen = readU16(data, localOff + 26)
      const lExtraLen = readU16(data, localOff + 28)
      const start = localOff + 30 + lNameLen + lExtraLen
      const raw = data.subarray(start, start + compSize)
      if (method === 0)
        return decoder.decode(raw)
      if (method === 8)
        return decoder.decode(await inflateRaw(raw))
      return null
    }
    offset += 46 + nameLen + extraLen + commentLen
  }
  return null
}

function decodeXmlEntities(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '\u0022')
    .replaceAll('&apos;', '\u0027')
    .replaceAll('&amp;', '&')
}

/** DOCX 的 document.xml → 纯文本（按段落换行） */
function docxXmlToText(xml: string): string {
  const unescaped = decodeXmlEntities(xml)
  const out: string[] = []
  for (const paragraph of unescaped.split('</w:p>')) {
    const text = paragraph
      .replace(/<w:tab[^>]*\/>/g, ' ')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00A0/g, ' ')
      .trim()
    if (text)
      out.push(text)
  }
  return out.join('\n')
}

export async function extractDocxText(data: Uint8Array): Promise<string> {
  const xml = await readZipEntry(data, 'word/document.xml')
  return xml ? docxXmlToText(xml) : ''
}

/** 读取 PDF 字符串字面量 `( … )`，处理转义与括号配对 */
function readPdfString(source: string, start: number): { text: string, end: number } {
  let i = start + 1
  let depth = 1
  let out = ''
  while (i < source.length && depth > 0) {
    const ch = source[i]!
    if (ch === '\\') {
      const next = source[i + 1]
      if (next === 'n' || next === 'r' || next === 't') {
        out += ' '
        i += 2
        continue
      }
      if (next === '(' || next === ')' || next === '\\') {
        out += next
        i += 2
        continue
      }
      if (next && /[0-7]/.test(next)) {
        let k = i + 1
        let num = ''
        while (k < source.length && num.length < 3 && /[0-7]/.test(source[k]!)) {
          num += source[k]!
          k++
        }
        out += String.fromCharCode(Number.parseInt(num, 8) || 32)
        i = k
        continue
      }
      if (next === '\r') {
        i += 3
        continue
      }
      out += ch
      i++
      continue
    }
    if (ch === '(') {
      depth++
      out += ch
      i++
      continue
    }
    if (ch === ')') {
      depth--
      if (depth > 0)
        out += ch
      i++
      continue
    }
    out += ch
    i++
  }
  return { text: out, end: i }
}

/** 从内容流里抽取文本片段，并在文本操作符处换行（尽力保留分段） */
function pdfContentToText(content: string): string {
  const parts: string[] = []
  let i = 0
  while (i < content.length) {
    const ch = content[i]!
    if (ch === '(') {
      const { text, end } = readPdfString(content, i)
      const trimmed = text.trim()
      if (trimmed)
        parts.push(trimmed)
      i = end
      continue
    }
    if (ch === 'T' && /[jd*]/i.test(content[i + 1] ?? '')) {
      parts.push('\n')
      i += 2
      continue
    }
    i++
  }
  return parts
    .join(' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const latin1 = new TextDecoder('latin1').decode(data)
  const out: string[] = []
  const re = /stream\r?\n/g
  let match: RegExpExecArray | null = re.exec(latin1)
  while (match) {
    const streamStart = match.index + match[0].length
    const dict = latin1.slice(Math.max(0, streamStart - 200), streamStart)
    const end = latin1.indexOf('endstream', streamStart)
    if (end < 0)
      break
    const raw = data.subarray(streamStart, end)
    let content: string
    if (/FlateDecode/.test(dict)) {
      try {
        content = new TextDecoder('latin1').decode(await inflateRaw(raw))
      }
      catch {
        content = new TextDecoder('latin1').decode(raw)
      }
    }
    else {
      content = new TextDecoder('latin1').decode(raw)
    }
    const text = pdfContentToText(content)
    if (text)
      out.push(text)
    match = re.exec(latin1)
  }
  return out.join('\n')
}

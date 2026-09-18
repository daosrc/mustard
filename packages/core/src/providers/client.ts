import type { ChatMessage, ChatRole, ModelDef, Provider } from '@mustard/shared'

export interface ChatChunk {
  delta: string
}

/** 统一的可识别错误：`code` 用于 UI 分支（如 MISSING_API_KEY） */
export class ProviderError extends Error {
  code: string

  constructor(code: string, message?: string) {
    super(message ?? code)
    this.name = 'ProviderError'
    this.code = code
  }
}

export function errorCode(error: unknown): string {
  if (error instanceof ProviderError)
    return error.code
  if (error instanceof Error && error.message)
    return error.message
  return 'UNKNOWN'
}

function textMessage(role: ChatRole, content: string): ChatMessage {
  return { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, content, createdAt: Date.now() }
}

/**
 * 对话系统提示：限定为翻译/语言助手，简洁作答，且**不透露模型/供应商/实现细节**。
 */
export const CHAT_SYSTEM_PROMPT
  = '你是「Mustard」，一个专注翻译与语言解释的助手。严格遵守：'
    + '1) 你只做翻译、词典、语言相关任务；其他话题礼貌拒绝并引导用户回到翻译。'
    + '2) 你**不是**任何其他模型或公司的产品，也不知道、不推测自己基于什么模型、供应商或版本。'
    + '3) 被问及身份/模型/公司/版本/实现时，只回答：「我是 Mustard，一个翻译与语言助手。」，不得出现任何模型名、公司名或技术细节。'
    + '4) 回答简洁直接；翻译任务只输出译文，不要解释过程。'

/** 身份/模型类问题的固定回复（避免模型泄露自身信息） */
export const IDENTITY_REPLY = '我是 Mustard，一个翻译与语言助手。请把需要翻译的内容发给我。'

export function isIdentityQuery(text: string): boolean {
  return /who are you|what model|which model|your model|model name|are you (?:gpt|claude|gemini|agnes|qwen|glm)|你是谁|你是什么|什么模型|哪家公司|什么公司|哪家的|什么大模型|基于什么|版本|version/i.test(text)
}

/** 若消息中没有 system，则前置系统提示 */
export function withSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  if (messages.some(m => m.role === 'system'))
    return messages
  return [{ id: 'system', role: 'system', content: CHAT_SYSTEM_PROMPT, createdAt: Date.now() }, ...messages]
}

/** 从 SSE 数据行解析出增量文本（OpenAI 兼容格式） */
export function parseSseDelta(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:'))
    return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]')
    return null
  try {
    const json = JSON.parse(payload)
    return json?.choices?.[0]?.delta?.content ?? null
  }
  catch {
    return null
  }
}

export type ChatContentPart
  = | { type: 'text', text: string }
    | { type: 'image_url', image_url: { url: string } }

export interface ChatBodyMessage {
  role: ChatMessage['role']
  content: string | ChatContentPart[]
}

export interface ChatBody {
  model: string
  stream: boolean
  messages: ChatBodyMessage[]
}

/** 把消息（含图片/文件附件）转成 OpenAI 兼容 content（多模态为 content 数组） */
export function toContentParts(message: ChatMessage): string | ChatContentPart[] {
  const images = (message.attachments ?? []).filter(a => a.type === 'image' && a.dataUrl)
  const fileText = (message.attachments ?? []).filter(a => a.type === 'file' && a.text).map(a => a.text).join('\n')
  const text = [message.content, fileText].filter(Boolean).join('\n')

  if (!images.length)
    return text
  const parts: ChatContentPart[] = []
  if (text)
    parts.push({ type: 'text', text })
  for (const image of images)
    parts.push({ type: 'image_url', image_url: { url: image.dataUrl! } })
  return parts
}

/** 组装 OpenAI 兼容的 chat/completions 请求体 */
export function buildChatBody(model: ModelDef, messages: ChatMessage[], stream = true): ChatBody {
  return {
    model: model.name,
    stream,
    messages: messages.map(m => ({
      role: m.role,
      content: toContentParts(m),
    })),
  }
}

/**
 * 调用 OpenAI 兼容接口（流式）。返回异步迭代器。
 * 未配置 apiKey 时抛出可识别的错误，供 UI 引导用户去设置页。
 */
export async function* chatStream(
  provider: Provider,
  model: ModelDef,
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatChunk> {
  if (!provider.apiKey)
    throw new ProviderError('MISSING_API_KEY')

  const res = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(buildChatBody(model, messages)),
    signal,
  })

  if (!res.ok || !res.body)
    throw new ProviderError(`PROVIDER_ERROR_${res.status}`, `请求失败（HTTP ${res.status}）`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const delta = parseSseDelta(line)
      if (delta)
        yield { delta }
    }
  }
}

/** 非流式单次调用，返回完整文本 */
export async function chatOnce(
  provider: Provider,
  model: ModelDef,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  if (!provider.apiKey)
    throw new ProviderError('MISSING_API_KEY')

  const res = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(buildChatBody(model, messages, false)),
    signal,
  })

  if (!res.ok)
    throw new ProviderError(`PROVIDER_ERROR_${res.status}`, `请求失败（HTTP ${res.status}）`)

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return json?.choices?.[0]?.message?.content ?? ''
}

/** 「测试连接」：发一条最小请求，成功即返回模型响应 */
export async function testConnection(
  provider: Provider,
  model: ModelDef,
  signal?: AbortSignal,
): Promise<string> {
  return chatOnce(provider, model, [textMessage('user', 'ping')], signal)
}

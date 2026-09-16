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

export interface ChatBody {
  model: string
  stream: boolean
  messages: Array<{ role: ChatMessage['role'], content: string }>
}

/** 组装 OpenAI 兼容的 chat/completions 请求体 */
export function buildChatBody(model: ModelDef, messages: ChatMessage[], stream = true): ChatBody {
  return {
    model: model.name,
    stream,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
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

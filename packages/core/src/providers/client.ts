import type { ChatMessage, ModelDef, Provider } from '@mustard/shared'

export interface ChatChunk {
  delta: string
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
    throw new Error('MISSING_API_KEY')

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
    throw new Error(`PROVIDER_ERROR_${res.status}`)

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

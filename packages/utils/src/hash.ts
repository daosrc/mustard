/** 稳定字符串哈希（缓存 key 用） */
export function hashString(input: string): string {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

export function cacheKey(...parts: Array<string | number | undefined>): string {
  return parts.filter(v => v !== undefined && v !== '').join('|')
}

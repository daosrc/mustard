/** 生成短 id（无需依赖 nanoid） */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const t = Date.now().toString(36)
  return `${prefix}${prefix ? '_' : ''}${t}${rand}`
}

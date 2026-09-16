/** 相对时间：刚刚 / n 分钟前 / n 小时前 / n 天前 */
export function timeAgo(ts: number, now: number = Date.now()): string {
  const m = Math.round((now - ts) / 60000)
  if (m < 1)
    return '刚刚'
  if (m < 60)
    return `${m} 分钟前`
  const h = Math.round(m / 60)
  if (h < 24)
    return `${h} 小时前`
  return `${Math.round(h / 24)} 天前`
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

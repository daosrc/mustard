/** 极简 LRU 缓存（翻译结果缓存用） */
export class LRU<K, V> {
  private map = new Map<K, V>()

  constructor(private readonly capacity: number = 500) {}

  get(key: K): V | undefined {
    if (!this.map.has(key))
      return undefined
    const value = this.map.get(key)!
    this.map.delete(key)
    this.map.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    if (this.map.has(key))
      this.map.delete(key)
    this.map.set(key, value)
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next()
      if (!oldest.done)
        this.map.delete(oldest.value)
    }
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  clear(): void {
    this.map.clear()
  }

  get size(): number {
    return this.map.size
  }
}

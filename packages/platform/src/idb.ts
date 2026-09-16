const DB_NAME = 'mustard'
const DB_VERSION = 1
const STORE = 'kv'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (): void => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE))
        db.createObjectStore(STORE)
    }
    request.onsuccess = (): void => resolve(request.result)
    request.onerror = (): void => reject(request.error)
  })
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(key)
    request.onsuccess = (): void => resolve(request.result as T | undefined)
    request.onerror = (): void => reject(request.error)
    tx.oncomplete = (): void => db.close()
  })
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = (): void => {
      db.close()
      resolve()
    }
    tx.onerror = (): void => reject(tx.error)
    tx.onabort = (): void => reject(tx.error)
  })
}

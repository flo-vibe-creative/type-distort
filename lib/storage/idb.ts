/**
 * 이미지 원본을 담아두는 아주 작은 저장소.
 *
 * 이미지는 용량이 커서 localStorage에 넣을 수 없으므로 IndexedDB를 쓴다.
 * 브라우저가 저장을 막아둔 환경(사생활 보호 모드 등)에서는 조용히 실패하고,
 * 작업 자체는 계속되도록 한다.
 */

const DB_NAME = 'type-distort'
const DB_VERSION = 1
const STORE = 'images'

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    let request: IDBOpenDBRequest
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch {
      resolve(null)
      return
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | null
): Promise<T | null> {
  return openDatabase().then(
    (database) =>
      new Promise<T | null>((resolve) => {
        if (!database) {
          resolve(null)
          return
        }
        try {
          const transaction = database.transaction(STORE, mode)
          const request = action(transaction.objectStore(STORE))
          if (!request) {
            transaction.oncomplete = () => resolve(null)
            transaction.onerror = () => resolve(null)
            return
          }
          request.onsuccess = () => resolve(request.result)
          request.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      })
  )
}

export function putImage(key: string, blob: Blob): Promise<void> {
  return runTransaction('readwrite', (store) => store.put(blob, key) as IDBRequest<unknown>).then(
    () => undefined
  )
}

export function getImage(key: string): Promise<Blob | null> {
  return runTransaction<Blob>('readonly', (store) => store.get(key) as IDBRequest<Blob>).then(
    (value) => value ?? null
  )
}

/** 더 이상 쓰지 않는 이미지를 정리한다 */
export async function keepOnlyImages(keys: readonly string[]): Promise<void> {
  const existing = await runTransaction<IDBValidKey[]>(
    'readonly',
    (store) => store.getAllKeys() as IDBRequest<IDBValidKey[]>
  )
  if (!existing) return

  const keep = new Set(keys)
  for (const key of existing) {
    if (typeof key === 'string' && !keep.has(key)) {
      await runTransaction('readwrite', (store) => store.delete(key) as IDBRequest<undefined>)
    }
  }
}

import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { subscribeLocale } from '../../src/localization/locale';

export class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  public failWrites = false;
  get length() { return this.values.size; }
  key(index: number) { return Array.from(this.values.keys())[index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error('Simulated storage failure');
    this.values.set(key, String(value));
  }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

/** Every test gets its own database factory, storage, and browser event target. */
export function resetEnvironment() {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  let reloads = 0;
  const browser = Object.assign(new EventTarget(), {
    indexedDB: new IDBFactory(),
    location: { reload: () => { reloads++; } },
    setTimeout,
  });
  for (const [key, value] of Object.entries({ window: browser, localStorage: local, sessionStorage: session, indexedDB: browser.indexedDB, IDBKeyRange })) {
    Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  }
  // The locale service is cached between tests, so explicitly refresh its snapshot.
  const unsubscribe = subscribeLocale(() => {});
  storageChanged(null);
  unsubscribe();
  return { local, session, browser, get reloads() { return reloads; } };
}

export function storageChanged(key: string | null) {
  const event = Object.assign(new Event('storage'), { key });
  window.dispatchEvent(event);
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
  });
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

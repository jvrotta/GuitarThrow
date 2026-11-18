/**
 * Tiny key-value store on IndexedDB. Falls back to memory where IndexedDB is missing (tests, private
 * modes that block it): the app keeps working, it just forgets on reload.
 */
const DB = 'guitarthrow';
const STORE = 'kv';
const mem = new Map<string, unknown>();
let db: Promise<IDBDatabase | null> | null = null;

function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  db ??= new Promise((resolve) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return db;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const d = await open();
  if (!d) return undefined;
  return new Promise((resolve, reject) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(key: string): Promise<T | undefined> {
  if (!(await open())) return mem.get(key) as T | undefined;
  return run<T>('readonly', (s) => s.get(key) as IDBRequest<T>);
}

export async function set(key: string, value: unknown): Promise<void> {
  if (!(await open())) return void mem.set(key, structuredClone(value));
  await run('readwrite', (s) => s.put(value, key));
}

export async function del(key: string): Promise<void> {
  if (!(await open())) return void mem.delete(key);
  await run('readwrite', (s) => s.delete(key));
}

/** Keys starting with `prefix`. */
export async function keys(prefix: string): Promise<string[]> {
  const all = (await open()) ? ((await run('readonly', (s) => s.getAllKeys())) ?? []) : [...mem.keys()];
  return all.map(String).filter((k) => k.startsWith(prefix));
}

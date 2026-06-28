// IndexedDB wrapper — all data lives on this device.
const DB_NAME = 'life-tracker';
const DB_VERSION = 2;

const STORES = {
  transactions: { keyPath: 'id', indexes: [['date', 'date']] },
  categories:   { keyPath: 'id', indexes: [['type', 'type']] },
  tasks:        { keyPath: 'id', indexes: [['dueDate', 'dueDate']] },
  activities:   { keyPath: 'id', indexes: [['day', 'day']] },
  budgets:      { keyPath: 'categoryId' },
};

let _db;

// Single mutation choke point so cloud sync can react to any data change without
// editing every view. importAll routes through put/clearStore, so it fires too.
let mutateHook = null;
export function setMutateHook(fn) { mutateHook = fn; }

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [name, cfg] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const os = db.createObjectStore(name, { keyPath: cfg.keyPath });
          for (const [idxName, key] of cfg.indexes || []) os.createIndex(idxName, key);
        }
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

export async function getAll(store, { index, query } = {}) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readonly');
    const src = index ? t.objectStore(store).index(index) : t.objectStore(store);
    const r = src.getAll(query);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function get(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const r = db.transaction(store, 'readonly').objectStore(store).get(key);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function put(store, value) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).put(value);
    t.oncomplete = () => { mutateHook?.(); res(value); };
    t.onerror = () => rej(t.error);
  });
}

export async function remove(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).delete(key);
    t.oncomplete = () => { mutateHook?.(); res(); };
    t.onerror = () => rej(t.error);
  });
}

export async function clearStore(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite');
    t.objectStore(store).clear();
    t.oncomplete = () => { mutateHook?.(); res(); };
    t.onerror = () => rej(t.error);
  });
}

// Full export / import for backups.
export async function exportAll() {
  const out = { _meta: { app: 'life-tracker', version: DB_VERSION, exportedAt: new Date().toISOString() } };
  for (const name of Object.keys(STORES)) out[name] = await getAll(name);
  return out;
}

export async function importAll(data, { replace = true } = {}) {
  for (const name of Object.keys(STORES)) {
    const rows = data[name];
    if (!Array.isArray(rows)) continue;
    if (replace) await clearStore(name);
    for (const row of rows) await put(name, row);
  }
}

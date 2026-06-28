// Single-user cloud sync: push/pull the whole dataset as one JSON blob.
// ponytail: whole-blob last-write-wins; fine for one user. Two devices editing at once = last
// writer wins. Move to per-record merge only if that actually bites.
import { exportAll, importAll } from './db.js';

const TS_KEY = 'lt.cloudTs';
const LOGGED_KEY = 'lt.loggedIn';

let dirty = false;
let suppress = false;     // true while applying a remote pull, so it doesn't echo back
let pushTimer = null;
let statusCb = null;

const localTs = () => Number(localStorage.getItem(TS_KEY) || 0);
const setLocalTs = (t) => localStorage.setItem(TS_KEY, String(t));

export function isLoggedIn() { return localStorage.getItem(LOGGED_KEY) === '1'; }
export function onStatus(cb) { statusCb = cb; }
function emit(s) { statusCb && statusCb(s); }

export async function login(password) {
  const r = await fetch('/api/login', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!r.ok) return false;
  localStorage.setItem(LOGGED_KEY, '1');
  return true;
}

export async function logout() {
  try { await fetch('/api/logout', { method: 'POST', credentials: 'include' }); } catch {}
  localStorage.removeItem(LOGGED_KEY);
  emit('offline');
}

// Pull cloud → local if the cloud copy is newer. Returns true if local data changed.
export async function pull() {
  if (!isLoggedIn()) return false;
  let res;
  try { res = await fetch('/api/data', { credentials: 'include' }); }
  catch { emit('offline'); return false; }
  if (res.status === 401) { localStorage.removeItem(LOGGED_KEY); emit('offline'); return false; }
  if (!res.ok) { emit('error'); return false; }

  const { updatedAt = 0, data } = await res.json();
  if (data && updatedAt > localTs()) {
    suppress = true;
    try { await importAll(data, { replace: true }); }
    finally { suppress = false; }
    setLocalTs(updatedAt);
    dirty = false;
    emit('synced');
    return true;
  }
  emit('synced');
  return false;
}

// Push local → cloud if there are unsynced changes.
export async function push() {
  if (!isLoggedIn() || !dirty) return;
  const updatedAt = Date.now();
  const data = await exportAll();
  emit('syncing');
  let res;
  try {
    res = await fetch('/api/data', {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedAt, data }),
    });
  } catch { emit('offline'); return; }
  if (res.status === 401) { localStorage.removeItem(LOGGED_KEY); emit('offline'); return; }
  if (!res.ok) { emit('error'); return; }
  setLocalTs(updatedAt);
  dirty = false;
  emit('synced');
}

// Registered as db.js mutation hook — fires on every local data change.
export function markDirty() {
  if (suppress) return;
  dirty = true;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 2000);
}

export function syncNow() { dirty = true; return push(); }

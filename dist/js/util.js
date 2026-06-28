// Small helpers: ids, dates, money formatting, DOM.

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---- Currency ----
const CUR_KEY = 'lt.currency';
export const getCurrency = () => localStorage.getItem(CUR_KEY) || '฿';
export const setCurrency = (c) => localStorage.setItem(CUR_KEY, c);

export function money(amount, { sign = false } = {}) {
  const n = Number(amount) || 0;
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const prefix = sign ? (n < 0 ? '-' : n > 0 ? '+' : '') : (n < 0 ? '-' : '');
  return `${prefix}${getCurrency()}${s}`;
}

// ---- Dates (local, no timezone surprises) ----
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const pad = (n) => String(n).padStart(2, '0');

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtDate(key) {
  const d = parseKey(key);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDateShort(key) {
  const d = parseKey(key);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
export function relativeDay(key) {
  const today = todayKey();
  if (key === today) return 'Today';
  const t = parseKey(today), k = parseKey(key);
  const diff = Math.round((k - t) / 86400000);
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return fmtDateShort(key);
}
export function fmtTimeLabel(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ---- Period ranges: returns {start, end} inclusive date keys + label ----
export function periodRange(kind, anchor = new Date()) {
  const a = new Date(anchor);
  if (kind === 'week') {
    const day = (a.getDay() + 6) % 7; // Monday start
    const start = new Date(a); start.setDate(a.getDate() - day);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return { start: todayKey(start), end: todayKey(end),
             label: `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}` };
  }
  if (kind === 'month') {
    const start = new Date(a.getFullYear(), a.getMonth(), 1);
    const end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
    return { start: todayKey(start), end: todayKey(end), label: `${MONTHS[a.getMonth()]} ${a.getFullYear()}` };
  }
  // year
  const start = new Date(a.getFullYear(), 0, 1);
  const end = new Date(a.getFullYear(), 11, 31);
  return { start: todayKey(start), end: todayKey(end), label: `${a.getFullYear()}` };
}

export function shiftAnchor(kind, anchor, dir) {
  const a = new Date(anchor);
  if (kind === 'week') a.setDate(a.getDate() + dir * 7);
  else if (kind === 'month') a.setMonth(a.getMonth() + dir);
  else a.setFullYear(a.getFullYear() + dir);
  return a;
}

export const inRange = (key, r) => key >= r.start && key <= r.end;

// ---- DOM ----
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function toast(msg) {
  const t = el(`<div style="position:fixed;left:50%;bottom:calc(var(--tab-h) + var(--safe-bottom) + 80px);
    transform:translateX(-50%);background:var(--surface-2);border:1px solid var(--border);
    color:var(--text);padding:11px 18px;border-radius:12px;z-index:200;font-weight:600;
    box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:90%;text-align:center">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; }, 1600);
  setTimeout(() => t.remove(), 1950);
}

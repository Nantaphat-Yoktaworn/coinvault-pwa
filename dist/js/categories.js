// Category storage + management UI. Categories are user-editable.
import { getAll, put, remove, get } from './db.js';
import { uid, el, esc, toast } from './util.js';
import { openSheet, closeSheet, confirmSheet } from './sheet.js';

const COLORS = ['#6366f1','#22c55e','#f43f5e','#f59e0b','#06b6d4','#a855f7','#ec4899','#14b8a6','#84cc16','#fb923c'];
const ICONS = ['🍔','🚗','🛒','🏠','💊','🎮','✈️','📱','🎓','💡','☕️','🎁','💰','💵','💼','📈','🐶','👕','⛽️','🎬','💧','🚬','🍺'];

const DEFAULTS = [
  { name: 'Food',          type: 'expense', icon: '🍔', color: '#f59e0b' },
  { name: 'Transport',     type: 'expense', icon: '🚗', color: '#06b6d4' },
  { name: 'Shopping',      type: 'expense', icon: '🛒', color: '#a855f7' },
  { name: 'Bills',         type: 'expense', icon: '🏠', color: '#6366f1' },
  { name: 'Health',        type: 'expense', icon: '💊', color: '#f43f5e' },
  { name: 'Entertainment', type: 'expense', icon: '🎮', color: '#ec4899' },
  { name: 'Water',         type: 'expense', icon: '💧', color: '#06b6d4' },
  { name: 'Cigarette',     type: 'expense', icon: '🚬', color: '#fb923c' },
  { name: 'Alcohol',       type: 'expense', icon: '🍺', color: '#a855f7' },
  { name: 'Other',         type: 'expense', icon: '💡', color: '#84cc16' },
  { name: 'Salary',        type: 'income',  icon: '💼', color: '#22c55e' },
  { name: 'Side income',   type: 'income',  icon: '📈', color: '#14b8a6' },
  { name: 'Gift',          type: 'income',  icon: '🎁', color: '#fb923c' },
  { name: 'Other',         type: 'income',  icon: '💰', color: '#6366f1' },
];

export async function seedDefaults() {
  if (localStorage.getItem('lt.seeded')) return;
  const existing = await getAll('categories');
  if (existing.length === 0) {
    for (const c of DEFAULTS) await put('categories', { id: uid(), ...c, order: Date.now() });
  }
  localStorage.setItem('lt.seeded', '1');
}

// One-time top-up of categories added after a user's first install. Runs once
// (guarded by a flag) and only adds names that aren't already present, so it
// won't resurrect ones the user has deleted on later launches.
const EXTRA = [
  { name: 'Water',     type: 'expense', icon: '💧', color: '#06b6d4' },
  { name: 'Cigarette', type: 'expense', icon: '🚬', color: '#fb923c' },
  { name: 'Alcohol',   type: 'expense', icon: '🍺', color: '#a855f7' },
];
export async function topUpCategories() {
  if (localStorage.getItem('lt.cats.v2')) return;
  const existing = await getAll('categories');
  const has = (c) => existing.some((e) => e.type === c.type && e.name === c.name);
  for (const c of EXTRA) if (!has(c)) await put('categories', { id: uid(), ...c, order: Date.now() });
  localStorage.setItem('lt.cats.v2', '1');
}

export async function listCategories(type) {
  const all = await getAll('categories');
  return all.filter((c) => !type || c.type === type)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export const categoryMap = async () => {
  const map = {};
  for (const c of await getAll('categories')) map[c.id] = c;
  return map;
};

// ---- Editor sheet (add / edit one category) ----
function editorForm(type, existing, onSaved) {
  const cat = existing || { type, icon: ICONS[0], color: COLORS[0], name: '' };
  const body = el(`<div>
    <label>Name</label>
    <input id="c-name" placeholder="e.g. Coffee" value="${esc(cat.name)}" />
    <label>Icon</label>
    <div class="pill-row" id="c-icons"></div>
    <label>Color</label>
    <div class="pill-row" id="c-colors"></div>
    <button class="btn" id="c-save" style="margin-top:18px">Save</button>
  </div>`);

  let icon = cat.icon, color = cat.color;
  const iconsWrap = body.querySelector('#c-icons');
  ICONS.forEach((ic) => {
    const b = el(`<button class="pill${ic === icon ? ' active' : ''}" style="font-size:1.2rem">${ic}</button>`);
    b.onclick = () => { icon = ic; [...iconsWrap.children].forEach((x) => x.classList.remove('active')); b.classList.add('active'); };
    iconsWrap.appendChild(b);
  });
  const colorsWrap = body.querySelector('#c-colors');
  COLORS.forEach((co) => {
    const b = el(`<button class="pill${co === color ? ' active' : ''}"><span class="swatch" style="background:${co}"></span></button>`);
    b.onclick = () => { color = co; [...colorsWrap.children].forEach((x) => x.classList.remove('active')); b.classList.add('active'); };
    colorsWrap.appendChild(b);
  });

  body.querySelector('#c-save').onclick = async () => {
    const name = body.querySelector('#c-name').value.trim();
    if (!name) return toast('Enter a name');
    const rec = { id: cat.id || uid(), name, type: cat.type, icon, color, order: cat.order || Date.now() };
    await put('categories', rec);
    closeSheet();
    onSaved && onSaved();
  };
  return body;
}

// ---- Manage sheet (list + add/edit/delete) ----
export function openManageCategories(onChange) {
  let type = 'expense';
  const body = el(`<div>
    <div class="segment" id="cm-seg">
      <button data-t="expense" class="active">Expense</button>
      <button data-t="income">Income</button>
    </div>
    <div id="cm-list" style="margin-top:14px"></div>
    <button class="btn secondary" id="cm-add" style="margin-top:8px">+ Add category</button>
    <p class="hint">Deleting a category keeps past records — they just show as "Uncategorized".</p>
  </div>`);

  async function render() {
    const list = body.querySelector('#cm-list');
    const cats = await listCategories(type);
    list.innerHTML = '';
    if (cats.length === 0) list.appendChild(el(`<p class="empty">No categories yet.</p>`));
    cats.forEach((c) => {
      const row = el(`<div class="list-row">
        <div class="row-icon" style="background:${c.color}22">${c.icon || '•'}</div>
        <div class="row-main"><div class="row-title">${esc(c.name)}</div></div>
        <button class="row-del" data-edit="${c.id}" style="color:var(--muted)">✎</button>
        <button class="row-del" data-del="${c.id}">🗑</button>
      </div>`);
      list.appendChild(row);
    });
  }

  body.querySelector('#cm-seg').addEventListener('click', (e) => {
    const t = e.target.dataset.t; if (!t) return;
    type = t;
    [...body.querySelector('#cm-seg').children].forEach((x) => x.classList.toggle('active', x.dataset.t === t));
    render();
  });
  body.querySelector('#cm-add').onclick = () =>
    openSheet('New category', editorForm(type, null, () => { openManageCategories(onChange); onChange && onChange(); }));
  body.addEventListener('click', async (e) => {
    const editId = e.target.dataset.edit;
    const delId = e.target.dataset.del;
    if (editId) {
      const cat = await get('categories', editId);
      openSheet('Edit category', editorForm(type, cat, () => { openManageCategories(onChange); onChange && onChange(); }));
    } else if (delId) {
      const ok = await confirmSheet('Delete category?', 'Past records will show as Uncategorized.');
      if (ok) { await remove('categories', delId); openManageCategories(onChange); onChange && onChange(); }
    }
  });

  openSheet('Categories', body);
  render();
}

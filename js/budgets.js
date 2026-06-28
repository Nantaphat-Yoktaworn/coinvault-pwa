// Monthly budgets: one optional overall limit + one optional limit per expense category.
// Stored in the `budgets` store keyed by categoryId; '__total__' is the overall budget.
import { getAll, put, remove } from './db.js';
import { el, esc, money, toast } from './util.js';
import { openSheet, closeSheet } from './sheet.js';
import { listCategories } from './categories.js';

export const TOTAL_ID = '__total__';

export async function getBudgets() {
  const map = {};
  for (const b of await getAll('budgets')) map[b.categoryId] = b.limit;
  return map;
}

async function setBudget(categoryId, limit) {
  if (limit > 0) await put('budgets', { categoryId, limit });
  else await remove('budgets', categoryId);
}

export function openManageBudgets(onChange) {
  const body = el(`<div>
    <label>Overall monthly limit</label>
    <input id="b-total" type="number" inputmode="decimal" min="0" placeholder="No limit" />
    <div class="section-title">Per category</div>
    <div id="b-list"></div>
    <button class="btn" id="b-save" style="margin-top:18px">Save</button>
    <p class="hint">Leave a field empty for no limit. Limits apply to each month. Track your progress on the Money tab.</p>
  </div>`);

  (async () => {
    const budgets = await getBudgets();
    const cats = await listCategories('expense');
    const totalInput = body.querySelector('#b-total');
    if (budgets[TOTAL_ID]) totalInput.value = budgets[TOTAL_ID];

    const list = body.querySelector('#b-list');
    for (const c of cats) {
      const row = el(`<div class="list-row">
        <div class="row-icon" style="background:${(c.color || '#888')}22">${c.icon || '•'}</div>
        <div class="row-main"><div class="row-title">${esc(c.name)}</div></div>
        <input data-cat="${c.id}" type="number" inputmode="decimal" min="0" placeholder="—"
               style="width:110px;text-align:right" value="${budgets[c.id] || ''}" />
      </div>`);
      list.appendChild(row);
    }

    body.querySelector('#b-save').onclick = async () => {
      await setBudget(TOTAL_ID, Number(totalInput.value) || 0);
      for (const inp of list.querySelectorAll('input[data-cat]')) {
        await setBudget(inp.dataset.cat, Number(inp.value) || 0);
      }
      closeSheet();
      toast('Budgets saved');
      onChange && onChange();
    };
  })();

  openSheet('Budgets', body);
}

// Build progress rows for a given month's per-category expense totals.
// `spentByCat` = { [categoryId]: amountSpent }, `totalExpense` = number, `cats` = id->category map.
export function budgetRows(budgets, spentByCat, totalExpense, cats) {
  const rows = [];
  if (budgets[TOTAL_ID]) rows.push({ name: 'Overall', color: '#8b5cf6', spent: totalExpense, limit: budgets[TOTAL_ID] });
  for (const [catId, limit] of Object.entries(budgets)) {
    if (catId === TOTAL_ID) continue;
    const c = cats[catId];
    if (!c) continue; // category was deleted
    rows.push({ name: c.name, color: c.color || '#8b5cf6', spent: spentByCat[catId] || 0, limit });
  }
  return rows;
}

// HTML for one budget bar. Green < 80%, amber 80–100%, red over.
export function budgetBarHtml(r) {
  const pct = r.limit > 0 ? r.spent / r.limit : 0;
  const over = r.spent - r.limit;
  const color = pct > 1 ? 'var(--expense)' : pct >= 0.8 ? 'var(--warn)' : 'var(--income)';
  const right = over > 0
    ? `<span class="overdue">Over by ${money(over)}</span>`
    : `${money(r.spent)} / ${money(r.limit)}`;
  return `<div class="bar-row">
    <div class="bar-head"><span>${esc(r.name)}</span><span>${right}</span></div>
    <div class="bar-track"><div class="bar-fill" style="width:${Math.min(pct, 1) * 100}%;background:${color}"></div></div>
  </div>`;
}

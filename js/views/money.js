// Money tab: monthly browser + add/edit transactions.
import { getAll, put, remove, get } from '../db.js';
import { uid, el, esc, money, todayKey, fmtDate, periodRange, shiftAnchor, inRange, toast } from '../util.js';
import { openSheet, closeSheet, confirmSheet } from '../sheet.js';
import { listCategories, categoryMap, openManageCategories } from '../categories.js';
import { getBudgets, budgetRows, budgetBarHtml } from '../budgets.js';

let anchor = new Date();

export async function render(root) {
  const range = periodRange('month', anchor);
  const all = await getAll('transactions');
  const cats = await categoryMap();
  const rows = all.filter((t) => inRange(t.date, range)).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt - a.createdAt));

  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // Budget progress for the visible month.
  const spentByCat = {};
  for (const t of rows) if (t.type === 'expense') spentByCat[t.categoryId] = (spentByCat[t.categoryId] || 0) + t.amount;
  const budgets = await getBudgets();
  const bRows = budgetRows(budgets, spentByCat, expense, cats);
  const budgetCard = bRows.length
    ? `<div class="card"><div class="section-title" style="margin-top:0">Budgets</div>${bRows.map(budgetBarHtml).join('')}</div>`
    : '';

  root.innerHTML = `
    <div class="period-nav">
      <button data-nav="-1">‹</button>
      <span class="period-label">${range.label}</span>
      <button data-nav="1">›</button>
    </div>
    <div class="card">
      <div class="balance">
        <div class="label">Net this month</div>
        <div class="value" style="color:${net >= 0 ? 'var(--income)' : 'var(--expense)'}">${money(net, { sign: true })}</div>
      </div>
      <div class="io-pair">
        <div class="box"><div class="label">Income</div><div class="num amt-income">${money(income)}</div></div>
        <div class="box"><div class="label">Expense</div><div class="num amt-expense">${money(expense)}</div></div>
      </div>
    </div>
    ${budgetCard}
    <div id="tx-list"></div>
  `;

  const list = root.querySelector('#tx-list');
  if (rows.length === 0) {
    list.appendChild(el(`<div class="empty"><div class="big">💸</div>No transactions this month.<br/>Tap + to add one.</div>`));
  } else {
    // group by day
    const byDay = {};
    for (const t of rows) (byDay[t.date] ||= []).push(t);
    for (const day of Object.keys(byDay).sort((a, b) => b.localeCompare(a))) {
      list.appendChild(el(`<div class="section-title">${fmtDate(day)}</div>`));
      const card = el(`<div class="card" style="padding:4px 16px"></div>`);
      for (const t of byDay[day]) {
        const c = cats[t.categoryId];
        const row = el(`<div class="list-row" data-id="${t.id}">
          <div class="row-icon" style="background:${(c?.color || '#888')}22">${c?.icon || '•'}</div>
          <div class="row-main">
            <div class="row-title">${esc(c?.name || 'Uncategorized')}</div>
            ${t.note ? `<div class="row-sub">${esc(t.note)}</div>` : ''}
          </div>
          <div class="row-amt amt-${t.type}">${t.type === 'income' ? '+' : '-'}${money(t.amount)}</div>
        </div>`);
        row.onclick = () => openTxSheet(t);
        card.appendChild(row);
      }
      list.appendChild(card);
    }
  }

  root.querySelectorAll('[data-nav]').forEach((b) =>
    b.onclick = () => { anchor = shiftAnchor('month', anchor, Number(b.dataset.nav)); render(root); });
}

// Exposed for the FAB.
export function openAdd() { openTxSheet(null); }

async function openTxSheet(existing) {
  const tx = existing || { type: 'expense', amount: '', categoryId: null, date: todayKey(), note: '' };
  const body = el(`<div>
    <div class="segment io" id="tx-type">
      <button data-t="expense" class="expense ${tx.type === 'expense' ? 'active' : ''}">Expense</button>
      <button data-t="income" class="income ${tx.type === 'income' ? 'active' : ''}">Income</button>
    </div>
    <label>Amount</label>
    <input id="tx-amt" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0" value="${tx.amount || ''}" />
    <label style="display:flex;justify-content:space-between;align-items:center">Category
      <button class="btn ghost" id="tx-managecat" style="width:auto;padding:4px 8px;font-size:.85rem">Manage</button>
    </label>
    <div class="pill-row" id="tx-cats"></div>
    <label>Date</label>
    <input id="tx-date" type="date" value="${tx.date}" />
    <label>Note (optional)</label>
    <input id="tx-note" placeholder="What for?" value="${esc(tx.note || '')}" />
    <div class="btn-row" style="margin-top:20px">
      ${existing ? '<button class="btn danger" id="tx-del">Delete</button>' : ''}
      <button class="btn" id="tx-save">Save</button>
    </div>
  </div>`);

  let type = tx.type;
  let categoryId = tx.categoryId;

  async function renderCats() {
    const wrap = body.querySelector('#tx-cats');
    const cats = await listCategories(type);
    wrap.innerHTML = '';
    if (cats.length === 0) wrap.appendChild(el(`<span class="hint">No categories — tap Manage to add.</span>`));
    cats.forEach((c) => {
      const b = el(`<button class="pill${c.id === categoryId ? ' active' : ''}">${c.icon || ''} ${esc(c.name)}</button>`);
      b.onclick = () => { categoryId = c.id; [...wrap.children].forEach((x) => x.classList.remove('active')); b.classList.add('active'); };
      wrap.appendChild(b);
    });
  }

  body.querySelector('#tx-type').addEventListener('click', (e) => {
    const t = e.target.dataset.t; if (!t) return;
    type = t; categoryId = null;
    [...body.querySelectorAll('#tx-type button')].forEach((x) => x.classList.toggle('active', x.dataset.t === t));
    renderCats();
  });
  body.querySelector('#tx-managecat').onclick = () => openManageCategories(() => renderCats());

  body.querySelector('#tx-save').onclick = async () => {
    const amount = parseFloat(body.querySelector('#tx-amt').value);
    if (!amount || amount <= 0) return toast('Enter an amount');
    if (!categoryId) return toast('Pick a category');
    const rec = {
      id: tx.id || uid(),
      type, amount, categoryId,
      date: body.querySelector('#tx-date').value || todayKey(),
      note: body.querySelector('#tx-note').value.trim(),
      createdAt: tx.createdAt || Date.now(),
    };
    await put('transactions', rec);
    closeSheet();
    toast(existing ? 'Updated' : 'Saved');
    render(document.getElementById('view'));
  };

  if (existing) body.querySelector('#tx-del').onclick = async () => {
    const ok = await confirmSheet('Delete transaction?', 'This cannot be undone.');
    if (ok) { await remove('transactions', tx.id); closeSheet(); render(document.getElementById('view')); }
  };

  openSheet(existing ? 'Edit transaction' : 'Add transaction', body);
  renderCats();
}

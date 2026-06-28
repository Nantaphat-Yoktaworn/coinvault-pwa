// Stats tab: weekly / monthly / yearly summaries with a category breakdown.
import { getAll } from '../db.js';
import { el, esc, money, periodRange, shiftAnchor, inRange } from '../util.js';
import { categoryMap } from '../categories.js';

let kind = 'month';   // week | month | year
let anchor = new Date();
let breakdown = 'expense'; // which side the donut shows

export async function render(root) {
  const range = periodRange(kind, anchor);
  const all = await getAll('transactions');
  const cats = await categoryMap();
  const rows = all.filter((t) => inRange(t.date, range));

  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // group breakdown side by category
  const groups = {};
  for (const t of rows.filter((t) => t.type === breakdown)) {
    const key = t.categoryId || 'none';
    (groups[key] ||= { amount: 0, cat: cats[t.categoryId] });
    groups[key].amount += t.amount;
  }
  const breakdownTotal = breakdown === 'expense' ? expense : income;
  const sorted = Object.values(groups).sort((a, b) => b.amount - a.amount);

  root.innerHTML = `
    <div class="segment" id="st-kind">
      <button data-k="week" class="${kind === 'week' ? 'active' : ''}">Week</button>
      <button data-k="month" class="${kind === 'month' ? 'active' : ''}">Month</button>
      <button data-k="year" class="${kind === 'year' ? 'active' : ''}">Year</button>
    </div>
    <div class="period-nav" style="margin-top:14px">
      <button data-nav="-1">‹</button>
      <span class="period-label">${range.label}</span>
      <button data-nav="1">›</button>
    </div>
    <div class="card">
      <div class="balance">
        <div class="label">Net</div>
        <div class="value" style="color:${net >= 0 ? 'var(--income)' : 'var(--expense)'}">${money(net, { sign: true })}</div>
      </div>
      <div class="io-pair">
        <div class="box"><div class="label">Income</div><div class="num amt-income">${money(income)}</div></div>
        <div class="box"><div class="label">Expense</div><div class="num amt-expense">${money(expense)}</div></div>
      </div>
    </div>

    <div class="segment" id="st-side" style="margin-bottom:14px">
      <button data-s="expense" class="${breakdown === 'expense' ? 'active' : ''}">By expense</button>
      <button data-s="income" class="${breakdown === 'income' ? 'active' : ''}">By income</button>
    </div>
    <div class="card" id="st-breakdown"></div>
  `;

  const bd = root.querySelector('#st-breakdown');
  if (sorted.length === 0 || breakdownTotal === 0) {
    bd.innerHTML = `<div class="empty" style="padding:24px">No ${breakdown} records in this period.</div>`;
  } else {
    bd.appendChild(donut(sorted, breakdownTotal));
    sorted.forEach((g) => {
      const pct = Math.round((g.amount / breakdownTotal) * 100);
      bd.appendChild(el(`<div class="bar-row">
        <div class="bar-head">
          <span>${g.cat ? `${g.cat.icon || ''} ${esc(g.cat.name)}` : 'Uncategorized'} <span class="tag">${pct}%</span></span>
          <span>${money(g.amount)}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${g.cat?.color || '#888'}"></div></div>
      </div>`));
    });
  }

  root.querySelector('#st-kind').addEventListener('click', (e) => {
    const k = e.target.dataset.k; if (!k) return; kind = k; anchor = new Date(); render(root);
  });
  root.querySelector('#st-side').addEventListener('click', (e) => {
    const s = e.target.dataset.s; if (!s) return; breakdown = s; render(root);
  });
  root.querySelectorAll('[data-nav]').forEach((b) =>
    b.onclick = () => { anchor = shiftAnchor(kind, anchor, Number(b.dataset.nav)); render(root); });
}

function donut(items, total) {
  const size = 132, r = 52, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = items.map((g) => {
    const frac = g.amount / total;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${g.cat?.color || '#888'}" stroke-width="16"
      stroke-dasharray="${(frac * circ).toFixed(2)} ${circ.toFixed(2)}"
      stroke-dashoffset="${(-offset * circ).toFixed(2)}"
      transform="rotate(-90 ${cx} ${cy})" />`;
    offset += frac;
    return seg;
  }).join('');
  return el(`<div class="donut-wrap" style="margin-bottom:6px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
      ${segs}
    </svg>
    <div>
      <div class="row-sub">Total</div>
      <div class="donut-center">${money(total)}</div>
    </div>
  </div>`);
}

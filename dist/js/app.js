// Main controller: tab routing, FAB, settings, service-worker registration.
import { seedDefaults } from './categories.js';
import { openSettings } from './settings.js';
import { setMutateHook } from './db.js';
import { markDirty, isLoggedIn, pull } from './cloud.js';
import * as money from './views/money.js';
import * as stats from './views/stats.js';

const VIEWS = {
  money: { mod: money, title: 'Money', fab: money.openAdd },
  stats: { mod: stats, title: 'Stats', fab: null },
};

const viewEl = document.getElementById('view');
const titleEl = document.getElementById('view-title');
const tabBar = document.getElementById('tab-bar');
let active = 'money';
let fabBtn = null;

async function show(name) {
  active = name;
  const v = VIEWS[name];
  titleEl.textContent = v.title;
  [...tabBar.querySelectorAll('.tab')].forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  viewEl.scrollIntoView({ block: 'start' });
  window.scrollTo(0, 0);
  await v.mod.render(viewEl);
  renderFab(v.fab);
}

function renderFab(handler) {
  if (fabBtn) { fabBtn.remove(); fabBtn = null; }
  if (!handler) return;
  fabBtn = document.createElement('button');
  fabBtn.className = 'fab';
  fabBtn.setAttribute('aria-label', 'Add');
  fabBtn.onclick = handler;
  document.body.appendChild(fabBtn);
}

tabBar.addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (tab) show(tab.dataset.view);
});

document.getElementById('settings-btn').onclick = () => openSettings(() => show(active));

async function init() {
  setMutateHook(markDirty);
  await seedDefaults();

  // If logged in, pull cloud data first so a fresh device shows the latest.
  if (isLoggedIn()) {
    const changed = await pull();
    await show('money');
    if (changed) await show(active); // re-render with pulled data
  } else {
    await show('money');
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
init();

// Main controller: tab routing, FAB, settings, service-worker registration.
import { seedDefaults, topUpCategories } from './categories.js';
import { openSettings } from './settings.js';
import { setMutateHook } from './db.js';
import { markDirty, isLoggedIn, pull } from './cloud.js';
import { showLogin } from './login.js';
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

  // Login gate: must log in before using the app. The session is remembered on the
  // device, so returning users skip this and go straight to their data.
  if (!isLoggedIn()) {
    await showLogin();   // resolves after a successful login (which also pulls)
  } else {
    await pull();        // returning user — sync latest from cloud
  }

  // After syncing, add any categories introduced in an update (runs once). Doing this
  // post-pull means the additions land on top of cloud data and then sync back up.
  await topUpCategories();
  await show('money');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}
init();

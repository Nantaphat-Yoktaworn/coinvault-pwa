// Settings sheet: backup, restore, currency, manage categories, reset.
import { exportAll, importAll } from './db.js';
import { el, esc, toast, getCurrency, setCurrency, todayKey } from './util.js';
import { openSheet, closeSheet, confirmSheet } from './sheet.js';
import { openManageCategories } from './categories.js';
import { isLoggedIn, login, logout, syncNow, pull } from './cloud.js';


export function openSettings(onChange) {
  const cloud = isLoggedIn()
    ? `<div class="section-title">Cloud sync</div>
       <p class="hint" id="s-cloud-status" style="margin-top:0">Logged in — your data syncs automatically.</p>
       <button class="btn secondary" id="s-sync">⟳ Sync now</button>
       <button class="btn secondary" id="s-logout" style="margin-top:10px">Log out</button>`
    : `<div class="section-title">Cloud sync</div>
       <input id="s-pw" type="password" placeholder="Password" autocomplete="current-password" />
       <button class="btn" id="s-login" style="margin-top:10px">Log in</button>
       <p class="hint">Log in to back up and sync this device to the cloud. The app keeps working offline either way.</p>`;

  const body = el(`<div>
    <div class="section-title" style="margin-top:0">Data</div>
    <button class="btn secondary" id="s-backup">⬇︎ Back up to file</button>
    <button class="btn secondary" id="s-restore" style="margin-top:10px">⬆︎ Restore from file</button>
    <p class="hint">Your data lives on this device. Back up regularly so you never lose it — the file works on any device.</p>

    ${cloud}

    <div class="section-title">Setup</div>
    <button class="btn secondary" id="s-cats">Manage categories</button>
    <label>Currency symbol</label>
    <input id="s-cur" maxlength="4" value="${esc(getCurrency())}" />

    <div class="section-title">Danger zone</div>
    <button class="btn danger" id="s-reset">Erase all data</button>

    <p class="hint" style="margin-top:24px">To install on iPhone: open in Safari → Share → <b>Add to Home Screen</b>.</p>

    <input type="file" id="s-file" accept="application/json,.json" hidden />
  </div>`);

  body.querySelector('#s-backup').onclick = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `life-tracker-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup downloaded');
  };

  const fileInput = body.querySelector('#s-file');
  body.querySelector('#s-restore').onclick = () => fileInput.click();
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const ok = await confirmSheet('Restore backup?', 'This replaces all current data on this device.', { okText: 'Restore', danger: true });
    if (!ok) { fileInput.value = ''; return; }
    try {
      const data = JSON.parse(await file.text());
      await importAll(data, { replace: true });
      toast('Restored');
      closeSheet();
      onChange && onChange();
    } catch (e) {
      toast('Could not read that file');
    }
  };

  if (isLoggedIn()) {
    body.querySelector('#s-sync').onclick = async () => {
      const status = body.querySelector('#s-cloud-status');
      status.textContent = 'Syncing…';
      await syncNow();
      status.textContent = 'Synced ✓ — your data syncs automatically.';
      toast('Synced');
    };
    body.querySelector('#s-logout').onclick = async () => {
      await logout();
      toast('Logged out');
      openSettings(onChange); // re-render the sheet in logged-out state
    };
  } else {
    const doLogin = async () => {
      const pw = body.querySelector('#s-pw').value;
      if (!pw) return toast('Enter your password');
      const ok = await login(pw);
      if (!ok) return toast('Wrong password');
      toast('Logged in');
      const pulled = await pull();   // load cloud data if it's newer
      if (!pulled) await syncNow();  // else seed the cloud with this device's data
      onChange && onChange();        // re-render the active view
      openSettings(onChange);        // re-render the sheet in logged-in state
    };
    body.querySelector('#s-login').onclick = doLogin;
    body.querySelector('#s-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
  }

  body.querySelector('#s-cats').onclick = () => openManageCategories(onChange);

  body.querySelector('#s-cur').onchange = (e) => {
    const v = e.target.value.trim() || '฿';
    setCurrency(v);
    toast('Currency updated');
    onChange && onChange();
  };

  body.querySelector('#s-reset').onclick = async () => {
    const ok = await confirmSheet('Erase everything?', 'All transactions, tasks and logs will be permanently deleted.', { okText: 'Erase all' });
    if (!ok) return;
    await importAll({ transactions: [], categories: [], tasks: [], activities: [] }, { replace: true });
    localStorage.removeItem('lt.seeded');
    location.reload();
  };

  openSheet('Settings', body);
}

// Full-screen login gate. Resolves once the user logs in (and cloud data is pulled).
import { el } from './util.js';
import { login, pull } from './cloud.js';

export function showLogin() {
  return new Promise((resolve) => {
    document.body.classList.add('locked');
    const view = document.getElementById('view');
    const screen = el(`<div class="login-screen">
      <img class="login-logo" src="icons/icon-180.png" alt="CoinVault" />
      <h1 class="login-title">CoinVault</h1>
      <p class="login-sub">Private income &amp; expense tracker</p>
      <input id="lg-pw" type="password" placeholder="Password" autocomplete="current-password" />
      <button class="btn" id="lg-go">Log in</button>
      <p class="login-err" id="lg-err"></p>
    </div>`);
    view.innerHTML = '';
    view.appendChild(screen);

    const pw = screen.querySelector('#lg-pw');
    const btn = screen.querySelector('#lg-go');
    const err = screen.querySelector('#lg-err');

    const go = async () => {
      const v = pw.value;
      if (!v) return;
      err.textContent = '';
      btn.disabled = true;
      btn.textContent = 'Logging in…';
      let ok;
      try { ok = await login(v); }
      catch { err.textContent = 'Can’t reach the server. Check your connection.'; reset(); return; }
      if (!ok) { err.textContent = 'Wrong password.'; pw.value = ''; reset(); return; }
      try { await pull(); } catch {}
      document.body.classList.remove('locked');
      resolve();
    };
    const reset = () => { btn.disabled = false; btn.textContent = 'Log in'; };

    btn.onclick = go;
    pw.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    pw.focus();
  });
}

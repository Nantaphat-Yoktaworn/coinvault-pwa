// Bottom-sheet modal. openSheet(title, contentEl) -> closeSheet()
import { el } from './util.js';

let current = null;

export function openSheet(title, content) {
  closeSheet();
  const overlay = el(`<div class="sheet-overlay"><div class="sheet">
      <div class="sheet-grip"></div>
      <h2></h2>
      <div class="sheet-body"></div>
    </div></div>`);
  overlay.querySelector('h2').textContent = title;
  overlay.querySelector('.sheet-body').appendChild(content);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeSheet(); });
  document.getElementById('sheet-root').appendChild(overlay);
  current = overlay;
  return overlay;
}

export function closeSheet() {
  if (current) { current.remove(); current = null; }
}

// Simple confirm dialog returning a promise<boolean>.
export function confirmSheet(title, message, { okText = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const body = el(`<div>
      <p class="hint" style="font-size:.95rem;color:var(--text)">${message}</p>
      <div class="btn-row" style="margin-top:18px">
        <button class="btn secondary" data-act="cancel">Cancel</button>
        <button class="btn ${danger ? 'danger' : ''}" data-act="ok">${okText}</button>
      </div></div>`);
    body.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      closeSheet();
      resolve(act === 'ok');
    });
    openSheet(title, body);
  });
}

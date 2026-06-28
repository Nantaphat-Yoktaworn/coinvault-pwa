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
  enableDragClose(overlay.querySelector('.sheet'));
  document.getElementById('sheet-root').appendChild(overlay);
  current = overlay;
  return overlay;
}

// Drag the sheet down to dismiss (phones). Only engages when the sheet is scrolled
// to the top, so it never fights with scrolling long content.
function enableDragClose(sheet) {
  let startY = 0, dy = 0, dragging = false;
  sheet.addEventListener('touchstart', (e) => {
    if (sheet.scrollTop > 0) { dragging = false; return; }
    startY = e.touches[0].clientY; dy = 0; dragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    dy = e.touches[0].clientY - startY;
    if (dy <= 0) { sheet.style.transform = ''; return; }  // upward → allow normal scroll
    e.preventDefault();
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: false });
  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    sheet.style.transition = '';
    if (dy > 110) closeSheet();
    else sheet.style.transform = '';
  });
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

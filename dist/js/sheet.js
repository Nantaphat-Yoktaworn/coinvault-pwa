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

// Drag the sheet down to dismiss (phones). Direction is locked after a few pixels:
// a downward start (while scrolled to top) becomes a drag; an upward start stays a
// native scroll. This avoids losing the gesture on the ambiguous first move.
function enableDragClose(sheet) {
  let startY = 0, dy = 0, mode = null; // null = undecided, 'drag', 'scroll'
  sheet.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY; dy = 0;
    mode = sheet.scrollTop > 0 ? 'scroll' : null; // not at top → it's a scroll
    if (mode === null) sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    dy = e.touches[0].clientY - startY;
    if (mode === null) {
      if (dy > 6) mode = 'drag';
      else if (dy < -6) mode = 'scroll';
      else return;
    }
    if (mode !== 'drag') return; // let native scrolling happen
    e.preventDefault();
    sheet.style.transform = `translateY(${Math.max(dy, 0)}px)`;
  }, { passive: false });
  const end = () => {
    sheet.style.transition = '';
    if (mode === 'drag') {
      if (dy > 110) closeSheet();
      else sheet.style.transform = '';
    }
    mode = null;
  };
  sheet.addEventListener('touchend', end);
  sheet.addEventListener('touchcancel', end);
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

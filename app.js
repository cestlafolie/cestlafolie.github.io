// ===== Outils partagés par tous les modules =====
const $ = id => document.getElementById(id);

let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// Petite vibration sur mobile (ignorée si non supportée)
function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

// Regroupe plusieurs demandes d'affichage en un seul rendu par image (fluidité)
function rafBatch(fn) {
  let queued = false;
  return () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fn(); }); };
}

// Anime un nombre affiché d'une valeur à une autre
function tweenText(el, to, fmt, ms = 450) {
  const from = +el.dataset.val || 0;
  el.dataset.val = to;
  if (from === to || matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  cancelAnimationFrame(el._raf);
  const step = now => {
    const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (p < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}

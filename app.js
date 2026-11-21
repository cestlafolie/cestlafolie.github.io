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

// ===== Onglets (menu latéral) =====
(() => {
  const side = $('side'), scrim = $('scrim');
  const tabs = [...document.querySelectorAll('.tab')];
  const close = () => { side.classList.remove('open'); scrim.classList.remove('show'); };
  function show(name, push) {
    const mod = document.getElementById('mod-' + name) || document.querySelector('.module');
    name = mod.id.slice(4);
    document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m === mod));
    tabs.concat(railTabs).forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    const title = mod.dataset.title || name;
    $('topTitle').textContent = title; document.title = title;
    if (push && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    close();
  }
  // Copie de chaque onglet dans la barre de gauche (icône + nom court)
  const rail = $('rail');
  const railTabs = tabs.map(t => {
    const b = document.createElement('button');
    b.className = 'rail-tab'; b.dataset.tab = t.dataset.tab; b.setAttribute('aria-label', t.textContent.trim());
    b.innerHTML = t.querySelector('.tab-ico').outerHTML + '<span></span>';
    b.lastChild.textContent = t.dataset.short || t.textContent.trim();
    b.onclick = () => show(t.dataset.tab, true);
    rail.appendChild(b); return b;
  });
  tabs.forEach(t => t.onclick = () => show(t.dataset.tab, true));
  $('burger').onclick = () => { side.classList.add('open'); scrim.classList.add('show'); };
  scrim.onclick = close;
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || tabs[0].dataset.tab);

  // Gestes : glisser depuis le bord gauche pour ouvrir, glisser le menu vers la gauche pour fermer
  let x0 = null, y0 = 0, dx = 0, mode = null;
  const W = () => side.getBoundingClientRect().width;
  addEventListener('touchstart', e => {
    const t = e.touches[0], open = side.classList.contains('open');
    if (!open && t.clientX < 24) mode = 'open';
    else if (open && t.clientX < W() + 20) mode = 'close';
    else return;
    x0 = t.clientX; y0 = t.clientY; dx = 0;
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (x0 === null) return;
    const t = e.touches[0]; dx = t.clientX - x0;
    if (Math.abs(t.clientY - y0) > Math.abs(dx) && Math.abs(dx) < 10) { x0 = null; side.classList.remove('drag'); side.style.transform = ''; return; }
    side.classList.add('drag');
    const off = mode === 'open' ? Math.min(0, -W() + dx) : Math.min(0, dx);
    side.style.transform = 'translateX(' + off + 'px)';
  }, { passive: true });
  addEventListener('touchend', () => {
    if (x0 === null) return;
    side.classList.remove('drag'); side.style.transform = '';
    if (mode === 'open' && dx > 60) $('burger').onclick();
    if (mode === 'close' && dx < -60) close();
    x0 = null;
  });
})();

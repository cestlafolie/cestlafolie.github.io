// ===== Module : roue du hasard =====
// Liste de joueurs enregistrée sur l'appareil (localStorage), tirage individuel ou par équipes.
// Le hasard vient de crypto.getRandomValues (pas de Math.random).
(() => {
const KEY = 'roue_v1';
// couleur du segment + couleur du texte lisible dessus
const PALETTE = [['#ff4d6d', '#fff'], ['#ffb703', '#1a1300'], ['#3a86ff', '#fff'], ['#06d6a0', '#00261c'], ['#8338ec', '#fff'], ['#fb5607', '#fff'], ['#00bbf9', '#00222e'], ['#f15bb5', '#fff']];
const MAX = 40, LEDS = 24;

let st = load();
let rot = 0, spinning = false, ledTimer = null;
const svgNS = 'http://www.w3.org/2000/svg';
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function load() {
  const def = { players: [], mode: 'solo', teams: 2, remove: false, last: null };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { return def; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} }
const rnd = n => { // entier aléatoire uniforme dans [0, n)
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
};
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const active = () => st.players.filter(p => !p.out);
const colorOf = p => PALETTE[Math.max(0, st.players.indexOf(p)) % PALETTE.length];
const initial = name => (name.match(/\p{L}|\d/u) || ['?'])[0].toUpperCase();

// ---- dessin de la roue
function el(tag, attrs) { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function drawWheel() {
  const svg = $('rWheel'), list = active(), n = list.length;
  svg.innerHTML = '';
  // relief : léger dégradé lumineux par-dessus les segments
  const defs = el('defs', {});
  const rg = el('radialGradient', { id: 'rShade', cx: '50%', cy: '50%', r: '50%' });
  rg.append(el('stop', { offset: '30%', 'stop-color': '#fff', 'stop-opacity': '.18' }), el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': '.22' }));
  defs.appendChild(rg); svg.appendChild(defs);
  // couronne et lumières (fixes)
  svg.appendChild(el('circle', { r: 99, fill: '#151922', stroke: '#2a3040', 'stroke-width': 1 }));
  const leds = el('g', { id: 'rLeds' });
  for (let k = 0; k < LEDS; k++) {
    const t = (k / LEDS) * 2 * Math.PI;
    leds.appendChild(el('circle', { cx: 93 * Math.sin(t), cy: -93 * Math.cos(t), r: 1.6, class: 'r-led' + (k % 2 ? '' : ' on') }));
  }
  svg.appendChild(leds);

  const g = el('g', { id: 'rRot' }); g.style.transform = 'rotate(' + rot + 'deg)';
  svg.appendChild(g);
  const R = 88;
  if (!n) {
    g.appendChild(el('circle', { r: R, fill: '#0f1218', stroke: '#2a3040', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
    const t = el('text', { y: 50, 'text-anchor': 'middle', class: 'r-empty' }); t.textContent = 'Ajoute des joueurs'; g.appendChild(t);
    return;
  }
  const a = 360 / n;
  list.forEach((p, i) => {
    let [bg, fg] = colorOf(p);
    if (n === 1) g.appendChild(el('circle', { r: R, fill: bg }));
    else {
      const t1 = (i * a - 90) * Math.PI / 180, t2 = ((i + 1) * a - 90) * Math.PI / 180;
      const d = `M0 0 L${R * Math.cos(t1)} ${R * Math.sin(t1)} A${R} ${R} 0 ${a > 180 ? 1 : 0} 1 ${R * Math.cos(t2)} ${R * Math.sin(t2)}Z`;
      g.appendChild(el('path', { d, fill: bg, stroke: '#0b0d12', 'stroke-width': .9 }));
    }
    const fs = n > 24 ? 5.5 : n > 14 ? 7 : n > 8 ? 8.5 : 10;
    const label = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
    const c = (i + .5) * a, left = n > 1 && c > 180;   // moitié gauche : texte remis à l'endroit
    const t = el('text', { x: left ? -78 : 78, y: 0, 'text-anchor': left ? 'start' : 'end', 'dominant-baseline': 'central', 'font-size': fs, fill: fg, class: 'r-label', transform: `rotate(${c - 90 + (left ? 180 : 0)})` });
    t.textContent = label; g.appendChild(t);
  });
  g.appendChild(el('circle', { r: R, fill: 'url(#rShade)', 'pointer-events': 'none' }));
}

// ---- lumières qui défilent pendant le tirage
function leds(mode) {
  clearInterval(ledTimer);
  const all = [...document.querySelectorAll('#rLeds circle')];
  if (mode === 'chase') { let k = 0; ledTimer = setInterval(() => { all.forEach((c, i) => c.classList.toggle('on', (i + k) % 4 === 0)); k++; }, 70); }
  else if (mode === 'flash') { let k = 0; ledTimer = setInterval(() => { all.forEach(c => c.classList.toggle('on', k % 2 === 0)); if (++k > 7) { clearInterval(ledTimer); leds('idle'); } }, 120); }
  else all.forEach((c, i) => c.classList.toggle('on', i % 2 === 0));
}

// ---- angle actuel de la roue (pour le « clic » du pointeur à chaque segment)
function currentAngle() {
  const m = getComputedStyle($('rRot')).transform;
  if (!m || m === 'none') return 0;
  const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0;
  const [a, b] = v[1].split(',').map(Number);
  return ((Math.atan2(b, a) * 180 / Math.PI) + 360) % 360;
}

// ---- tour de roue jusqu'au segment i
function spinTo(i, n, ms) {
  return new Promise(res => {
    const a = 360 / n, center = (i + .5) * a, jitter = (rnd(1000) / 1000 - .5) * a * .6;
    const target = -(center + jitter);
    const cur = ((rot % 360) + 360) % 360;
    const delta = ((target - cur) % 360 + 360) % 360;
    rot += 360 * 5 + delta;
    const g = $('rRot'), dur = reduce() ? 300 : ms;
    g.style.transition = `transform ${dur}ms cubic-bezier(.12,.7,.1,1)`;
    requestAnimationFrame(() => { g.style.transform = 'rotate(' + rot + 'deg)'; });
    // pointeur qui claque à chaque passage de segment
    const ptr = document.querySelector('.r-pointer'); let lastSeg = null, raf;
    const watch = () => {
      const seg = Math.floor(((360 - currentAngle()) % 360) / a);
      if (lastSeg !== null && seg !== lastSeg && n > 1) { ptr.classList.remove('tick'); void ptr.offsetWidth; ptr.classList.add('tick'); }
      lastSeg = seg; raf = requestAnimationFrame(watch);
    };
    if (!reduce()) raf = requestAnimationFrame(watch);
    setTimeout(() => { cancelAnimationFrame(raf); g.style.transition = ''; res(); }, dur + 60);
  });
}

// ---- confettis
function confetti() {
  if (reduce()) return;
  const cv = document.createElement('canvas'); cv.className = 'r-confetti';
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const w = $('rWheel').getBoundingClientRect(), ox = w.left + w.width / 2, oy = w.top + w.height / 2;
  const parts = Array.from({ length: 90 }, () => {
    const ang = (rnd(360) / 180) * Math.PI, sp = 4 + rnd(70) / 10;
    return { x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4, s: 4 + rnd(5), r: rnd(360), vr: rnd(20) - 10, c: PALETTE[rnd(PALETTE.length)][0] };
  });
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0; ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += .22; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1600); ctx.translate(p.x, p.y); ctx.rotate(p.r * Math.PI / 180); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (t < 1600) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// ---- affichage du résultat
function showResult() {
  const box = $('rResult'), wrap = $('rResultWrap'), last = st.last;
  box.innerHTML = '';
  if (!last) { wrap.classList.remove('open'); return; }
  if (last.type === 'solo') {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = 'Tiré au sort';
    const v = document.createElement('div'); v.className = 'r-win';
    const p = st.players.find(x => x.name === last.name);
    const dot = document.createElement('i'); dot.style.setProperty('--wc', p ? colorOf(p)[0] : '#fff');
    const nm = document.createElement('span'); nm.textContent = last.name;
    v.append(dot, nm); box.append(k, v);
  } else {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = last.teams.length + ' équipes';
    const grid = document.createElement('div'); grid.className = 'r-teams';
    last.teams.forEach((team, i) => {
      const c = document.createElement('div'); c.className = 'r-team'; c.style.setProperty('--tc', PALETTE[(i * 3) % PALETTE.length][0]);
      const h = document.createElement('b'); h.textContent = 'Équipe ' + (i + 1);
      const ul = document.createElement('ul');
      team.forEach(name => { const li = document.createElement('li'); li.textContent = name; ul.appendChild(li); });
      c.append(h, ul); grid.appendChild(c);
    });
    box.append(k, grid);
  }
  wrap.classList.add('open');
  box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
}

// ---- liste des joueurs
function renderPlayers() {
  const chips = $('rChips'); chips.innerHTML = '';
  st.players.forEach(p => {
    const c = document.createElement('div'); c.className = 'r-chip' + (p.out ? ' out' : '');
    const name = document.createElement('button'); name.className = 'r-chip-n';
    const av = document.createElement('i'); av.textContent = initial(p.name); av.style.setProperty('--cc', colorOf(p)[0]);
    const nm = document.createElement('span'); nm.textContent = p.name;
    name.append(av, nm);
    name.title = p.out ? 'Remettre dans la roue' : 'Sortir de la roue';
    name.onclick = () => { if (spinning) return; p.out = !p.out; save(); renderAll(); };
    const x = document.createElement('button'); x.className = 'r-chip-x'; x.setAttribute('aria-label', 'Supprimer ' + p.name); x.textContent = '×';
    x.onclick = () => { if (spinning) return; st.players = st.players.filter(q => q !== p); save(); renderAll(); };
    c.append(name, x); chips.appendChild(c);
  });
  const n = active().length;
  $('rCount').textContent = st.players.length === n ? n : n + ' / ' + st.players.length;
  $('rBack').style.visibility = st.players.some(p => p.out) ? 'visible' : 'hidden';
  $('rClear').style.display = st.players.length ? '' : 'none';
}

function renderControls() {
  document.querySelectorAll('.r-mode-b').forEach(b => b.classList.toggle('on', b.dataset.mode === st.mode));
  $('mod-roue').dataset.mode = st.mode;
  $('rRemove').checked = st.remove;
  const n = active().length;
  st.teams = Math.max(2, Math.min(st.teams, Math.max(2, n), 8));
  $('rTeamN').textContent = st.teams;
  $('rSpin').textContent = st.mode === 'solo' ? 'Tourner' : 'Former';
  $('rSpin').disabled = spinning || (st.mode === 'solo' ? n < 1 : n < 2);
}
function renderAll() { if (!spinning) drawWheel(); renderPlayers(); renderControls(); }

// ---- actions
$('rAdd').onsubmit = e => {
  e.preventDefault();
  const inp = $('rName'), name = inp.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (st.players.length >= MAX) return toast('Maximum ' + MAX + ' joueurs');
  if (st.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast(name + ' est déjà dans la liste');
  st.players.push({ id: Date.now() + '' + rnd(1000), name, out: false });
  inp.value = ''; save(); renderAll(); buzz(8);
};
document.querySelectorAll('.r-mode-b').forEach(b => b.onclick = () => { if (spinning) return; st.mode = b.dataset.mode; save(); renderControls(); });
$('rRemove').onchange = e => { st.remove = e.target.checked; save(); };
$('rTeamMinus').onclick = () => { if (spinning) return; st.teams--; save(); renderControls(); };
$('rTeamPlus').onclick = () => { if (spinning) return; st.teams++; save(); renderControls(); };
$('rBack').onclick = () => { if (spinning) return; st.players.forEach(p => p.out = false); save(); renderAll(); };
$('rClear').onclick = () => { if (spinning || !confirm('Effacer toute la liste de joueurs ?')) return; st.players = []; st.last = null; save(); renderAll(); showResult(); };

$('rSpin').onclick = async () => {
  const list = active(), n = list.length;
  if (spinning || !n) return;
  spinning = true; renderControls(); buzz(10); leds('chase');
  $('rResultWrap').classList.remove('open');
  if (st.mode === 'solo') {
    const i = rnd(n);
    await spinTo(i, n, 4600);
    st.last = { type: 'solo', name: list[i].name };
    if (st.remove) list[i].out = true;
  } else {
    const k = Math.min(st.teams, n);
    await spinTo(rnd(n), n, 2600);
    const teams = Array.from({ length: k }, () => []);
    shuffle(list).forEach((p, idx) => teams[idx % k].push(p.name));
    st.last = { type: 'teams', teams };
  }
  spinning = false; save(); buzz([18, 50, 18]);
  renderAll(); leds('flash'); showResult(); confetti();
};

renderAll();
showResult();
})();

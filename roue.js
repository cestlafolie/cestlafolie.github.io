// ===== Module : tirage au sort (grille lumineuse) =====
// Liste de joueurs enregistrée sur l'appareil (localStorage), tirage individuel ou par équipes.
// Une lumière saute de case en case puis ralentit jusqu'au gagnant.
// Le hasard vient de crypto.getRandomValues (pas de Math.random).
(() => {
const KEY = 'roue_v1';
const PALETTE = ['#ff4d6d', '#ffb703', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#00bbf9', '#f15bb5'];
const TEAM = ['#ff4d6d', '#06d6a0', '#3a86ff', '#ffb703', '#8338ec', '#fb5607', '#00bbf9', '#f15bb5'];
const MAX = 40;

let st = load(), running = false;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

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

// ---- grille
function drawGrid() {
  const grid = $('rGrid'), list = active(), n = list.length;
  grid.innerHTML = '';
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : 5;
  grid.style.setProperty('--cols', cols);
  grid.dataset.size = n <= 9 ? 'l' : n <= 16 ? 'm' : 's';
  if (!n) { const e = document.createElement('p'); e.className = 'r-empty'; e.textContent = 'Ajoute des joueurs ci-dessous'; grid.appendChild(e); return; }
  list.forEach(p => {
    const c = document.createElement('div'); c.className = 'r-cell'; c.style.setProperty('--c', colorOf(p));
    const av = document.createElement('i'); av.textContent = initial(p.name);
    const nm = document.createElement('span'); nm.textContent = p.name;
    c.append(av, nm); grid.appendChild(c);
  });
}
const cells = () => [...$('rGrid').querySelectorAll('.r-cell')];

// ---- la lumière saute de case en case et s'arrête sur « target »
async function chase(target, steps) {
  const cs = cells(), n = cs.length;
  if (reduce() || n === 1) { cs[target].classList.add('hot'); await wait(250); return; }
  let pos = -1;
  for (let s = 0; s < steps; s++) {
    const last = s === steps - 1;
    let next = last ? target : rnd(n);
    if (!last && (next === pos || (s === steps - 2 && next === target))) next = (next + 1 + rnd(n - 1)) % n;
    if (pos >= 0) cs[pos].classList.remove('hot');
    cs[next].classList.add('hot'); pos = next;
    if (s % 2 === 0) buzz(4);
    const left = steps - s;                       // ralentit sur la fin
    await wait(left > 10 ? 70 : 70 + (10 - left) * (10 - left) * 5.5);
  }
}

// ---- confettis
function confetti() {
  if (reduce()) return;
  const cv = document.createElement('canvas'); cv.className = 'r-confetti';
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const w = (document.querySelector('.r-cell.won') || $('rStage')).getBoundingClientRect(), ox = w.left + w.width / 2, oy = w.top + w.height / 2;
  const parts = Array.from({ length: 90 }, () => {
    const ang = (rnd(360) / 180) * Math.PI, sp = 4 + rnd(70) / 10;
    return { x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 4, s: 4 + rnd(5), r: rnd(360), vr: rnd(20) - 10, c: PALETTE[rnd(PALETTE.length)] };
  });
  const t0 = performance.now();
  (function frame(now) {
    const t = now - t0; ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach(p => { p.vy += .22; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t / 1600); ctx.translate(p.x, p.y); ctx.rotate(p.r * Math.PI / 180); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
    if (t < 1600) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}

// ---- résultat (carte sous la grille + état de la grille)
function showResult() {
  const box = $('rResult'), wrap = $('rResultWrap'), last = st.last;
  box.innerHTML = '';
  cells().forEach(c => { c.classList.remove('hot', 'won', 'lost'); c.style.removeProperty('--t'); c.removeAttribute('data-team'); });
  if (!last) { wrap.classList.remove('open'); return; }
  if (last.type === 'solo') {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = 'Tiré au sort';
    const v = document.createElement('div'); v.className = 'r-win';
    const p = st.players.find(x => x.name === last.name);
    const dot = document.createElement('i'); dot.style.setProperty('--wc', p ? colorOf(p) : '#fff');
    const nm = document.createElement('span'); nm.textContent = last.name;
    v.append(dot, nm); box.append(k, v);
    // case gagnante allumée si la personne est encore dans la grille
    const idx = active().findIndex(x => x.name === last.name);
    if (idx >= 0) cells().forEach((c, i) => c.classList.add(i === idx ? 'won' : 'lost'));
  } else {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = last.teams.length + ' équipes';
    const grid = document.createElement('div'); grid.className = 'r-teams';
    last.teams.forEach((team, i) => {
      const c = document.createElement('div'); c.className = 'r-team'; c.style.setProperty('--tc', TEAM[i % TEAM.length]);
      const h = document.createElement('b'); h.textContent = 'Équipe ' + (i + 1);
      const ul = document.createElement('ul');
      team.forEach(name => { const li = document.createElement('li'); li.textContent = name; ul.appendChild(li); });
      c.append(h, ul); grid.appendChild(c);
    });
    box.append(k, grid);
    // chaque case prend la couleur de son équipe
    const list = active();
    last.teams.forEach((team, ti) => team.forEach(name => {
      const idx = list.findIndex(x => x.name === name);
      if (idx >= 0) { const c = cells()[idx]; c.style.setProperty('--t', TEAM[ti % TEAM.length]); c.dataset.team = ti + 1; c.style.transitionDelay = (idx * 45) + 'ms'; }
    }));
  }
  wrap.classList.add('open');
}

// ---- liste des joueurs
function renderPlayers() {
  const chips = $('rChips'); chips.innerHTML = '';
  st.players.forEach(p => {
    const c = document.createElement('div'); c.className = 'r-chip' + (p.out ? ' out' : '');
    const name = document.createElement('button'); name.className = 'r-chip-n';
    const av = document.createElement('i'); av.textContent = initial(p.name); av.style.setProperty('--cc', colorOf(p));
    const nm = document.createElement('span'); nm.textContent = p.name;
    name.append(av, nm);
    name.title = p.out ? 'Remettre dans le tirage' : 'Sortir du tirage';
    name.onclick = () => { if (running) return; p.out = !p.out; save(); renderAll(); };
    const x = document.createElement('button'); x.className = 'r-chip-x'; x.setAttribute('aria-label', 'Supprimer ' + p.name); x.textContent = '×';
    x.onclick = () => { if (running) return; st.players = st.players.filter(q => q !== p); save(); renderAll(); };
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
  $('rSpin').textContent = running ? 'Tirage…' : st.mode === 'solo' ? 'Lancer le tirage' : 'Former les équipes';
  $('rSpin').disabled = running || (st.mode === 'solo' ? n < 1 : n < 2);
}
function renderAll() { if (!running) { drawGrid(); showResult(); } renderPlayers(); renderControls(); }

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
document.querySelectorAll('.r-mode-b').forEach(b => b.onclick = () => { if (running) return; st.mode = b.dataset.mode; save(); renderControls(); });
$('rRemove').onchange = e => { st.remove = e.target.checked; save(); };
$('rTeamMinus').onclick = () => { if (running) return; st.teams--; save(); renderControls(); };
$('rTeamPlus').onclick = () => { if (running) return; st.teams++; save(); renderControls(); };
$('rBack').onclick = () => { if (running) return; st.players.forEach(p => p.out = false); save(); renderAll(); };
$('rClear').onclick = () => { if (running || !confirm('Effacer toute la liste de joueurs ?')) return; st.players = []; st.last = null; save(); renderAll(); };

$('rSpin').onclick = async () => {
  const list = active(), n = list.length;
  if (running || !n) return;
  running = true; renderControls(); buzz(10);
  $('rResultWrap').classList.remove('open');
  cells().forEach(c => { c.classList.remove('hot', 'won', 'lost'); c.style.removeProperty('--t'); c.removeAttribute('data-team'); });
  $('rStage').classList.add('running');
  if (st.mode === 'solo') {
    const i = rnd(n);
    await chase(i, 26 + rnd(8));
    st.last = { type: 'solo', name: list[i].name };
    cells().forEach((c, k) => { c.classList.remove('hot'); c.classList.add(k === i ? 'won' : 'lost'); });
    await wait(reduce() ? 0 : 900);              // on laisse voir la case gagnante avant de la retirer
    if (st.remove) list[i].out = true;
  } else {
    const k = Math.min(st.teams, n);
    await chase(rnd(n), 16);
    const teams = Array.from({ length: k }, () => []);
    shuffle(list).forEach((p, idx) => teams[idx % k].push(p.name));
    st.last = { type: 'teams', teams };
  }
  $('rStage').classList.remove('running');
  running = false; save(); buzz([18, 50, 18]);
  renderAll(); confetti();
};

renderAll();
})();

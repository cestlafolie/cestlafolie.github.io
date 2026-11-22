// ===== Module : tirage au sort (grille lumineuse), partagé entre tous les téléphones =====
// - L'état (joueurs, mode, nombre d'équipes, option, dernier résultat) est diffusé en direct via ntfy.sh :
//   à chaque modification, le téléphone envoie l'état complet ; le dernier reçu fait foi.
// - Un tirage envoie la séquence de la lumière + le résultat : l'animation se joue en même temps partout.
// - Chaque téléphone garde une copie locale. ntfy.sh oublie les messages après 12 h : si le serveur
//   n'a plus rien, la copie locale est renvoyée automatiquement.
// - Le hasard vient de crypto.getRandomValues (pas de Math.random).
(() => {
const TOPIC = 'https://ntfy.sh/cestlafolie-tirage-521wwesyqhkkvh4u';
const KEY = 'roue_v1';
const PALETTE = ['#ff4d6d', '#ffb703', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#00bbf9', '#f15bb5'];
const TEAM = ['#ff4d6d', '#06d6a0', '#3a86ff', '#ffb703', '#8338ec', '#fb5607', '#00bbf9', '#f15bb5'];
const MAX = 40, MAX_BYTES = 3800;   // ntfy.sh limite un message à 4 Ko

let st = load(), running = false, pending = null, remoteSeen = false, dirty = false, lastDrawId = null;
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- état local
function blank() { return { players: [], mode: 'solo', teams: 2, remove: false, last: null }; }
function sanitize(o) {
  const s = blank();
  if (o && Array.isArray(o.players)) s.players = o.players.filter(p => p && typeof p.name === 'string' && p.name.trim()).slice(0, MAX)
    .map(p => ({ name: p.name.slice(0, 24), out: !!p.out }));
  if (o && (o.mode === 'solo' || o.mode === 'teams')) s.mode = o.mode;
  if (o && Number.isInteger(o.teams)) s.teams = Math.max(2, Math.min(8, o.teams));
  if (o) s.remove = !!o.remove;
  if (o && o.last && o.last.type === 'solo' && typeof o.last.name === 'string') s.last = { type: 'solo', name: o.last.name };
  if (o && o.last && o.last.type === 'teams' && Array.isArray(o.last.teams)) s.last = { type: 'teams', teams: o.last.teams.filter(Array.isArray).map(t => t.filter(n => typeof n === 'string')) };
  return s;
}
function load() { try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return blank(); } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch {} }

const rnd = n => { // entier aléatoire uniforme dans [0, n)
  const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
};
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const active = () => st.players.filter(p => !p.out);
const colorOf = p => PALETTE[Math.max(0, st.players.findIndex(q => q.name === p.name)) % PALETTE.length];
const initial = name => (name.match(/\p{L}|\d/u) || ['?'])[0].toUpperCase();
const clone = o => JSON.parse(JSON.stringify(o));

// ---- partage en direct
function setSync(state) {
  const el = $('rSync'); el.className = 'r-sync ' + state;
  el.lastElementChild.textContent = state === 'on' ? 'Partagé en direct avec tous les téléphones' : state === 'offline' ? 'Hors ligne — modifications gardées sur ce téléphone' : 'Connexion…';
}
const live = liveTopic(TOPIC, {
  onStatus: s => { setSync(s); if (s === 'on' && dirty && live && live.isReady()) publishState(); },
  onReady: () => { if ((!remoteSeen && st.players.length) || dirty) publishState(); },   // le serveur a oublié : on renvoie la copie locale
  onMessage: (d, m, ready) => {
    if (d.k === 'state' && d.s) { remoteSeen = true; apply(sanitize(d.s)); }
    else if (d.k === 'draw' && d.s && Array.isArray(d.seq)) {
      remoteSeen = true;
      const fresh = ready && m.time > Date.now() / 1000 - 20;
      if (d.id === lastDrawId) return;                       // c'est notre propre tirage, déjà animé
      if (fresh && !running) playDraw(d.seq.filter(Number.isInteger), sanitize(d.s), d.w);
      else apply(sanitize(d.s));
    }
  },
});
function apply(s) {
  if (running) { pending = s; return; }
  st = s; save(); renderAll();
}
function payload(extra) {
  const msg = Object.assign({ s: st }, extra);
  const bytes = new TextEncoder().encode(JSON.stringify(msg)).length;
  return bytes > MAX_BYTES ? null : msg;
}
function publishState() {
  const msg = payload({ k: 'state' });
  if (!msg) return toast('Liste trop longue pour être partagée');
  live.publish(msg).then(() => { dirty = false; }).catch(() => { dirty = true; toast('Pas de connexion : modification gardée sur ce téléphone'); });
}
function commit() { save(); renderAll(); publishState(); }

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

// ---- séquence de la lumière (calculée par celui qui lance, rejouée par tous)
function makeSeq(target, steps, n) {
  if (n <= 1) return [target];
  const seq = []; let pos = -1;
  for (let s = 0; s < steps; s++) {
    const last = s === steps - 1;
    let next = last ? target : rnd(n);
    if (!last && (next === pos || (s === steps - 2 && next === target))) next = (next + 1 + rnd(n - 1)) % n;
    seq.push(next); pos = next;
  }
  return seq;
}
async function chase(seq) {
  const cs = cells(), n = cs.length;
  if (!n) return;
  if (reduce() || seq.length === 1) { const c = cs[seq[seq.length - 1]]; if (c) c.classList.add('hot'); await wait(250); return; }
  let prev = null;
  for (let s = 0; s < seq.length; s++) {
    if (prev) prev.classList.remove('hot');
    const c = cs[seq[s] % n]; c.classList.add('hot'); prev = c;
    if (s % 2 === 0) buzz(4);
    const left = seq.length - s;                    // ralentit sur la fin
    await wait(left > 10 ? 70 : 70 + (10 - left) * (10 - left) * 5.5);
  }
}

// ---- jouer un tirage (le sien ou celui reçu d'un autre téléphone)
async function playDraw(seq, next, winnerIdx, own) {
  running = true; renderControls();
  $('rResultWrap').classList.remove('open');
  cells().forEach(c => { c.classList.remove('hot', 'won', 'lost'); c.style.removeProperty('--t'); c.removeAttribute('data-team'); });
  $('rStage').classList.add('running');
  await chase(seq);
  if (Number.isInteger(winnerIdx)) {
    cells().forEach((c, k) => { c.classList.remove('hot'); c.classList.add(k === winnerIdx ? 'won' : 'lost'); });
    await wait(reduce() ? 0 : 900);              // on laisse voir la case gagnante avant de la retirer
  }
  $('rStage').classList.remove('running');
  running = false;
  // tirage d'un autre téléphone : un état reçu pendant l'animation est plus récent, on le garde.
  // notre propre tirage : un état reçu pendant l'animation peut être l'écho d'une ancienne modification, on l'ignore.
  st = (!own && pending) ? pending : next; pending = null;
  save(); buzz([18, 50, 18]); renderAll(); confetti();
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
  cells().forEach(c => { c.classList.remove('hot', 'won', 'lost'); c.style.removeProperty('--t'); c.removeAttribute('data-team'); c.style.transitionDelay = ''; });
  if (!last) { wrap.classList.remove('open'); return; }
  if (last.type === 'solo') {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = 'Tiré au sort';
    const v = document.createElement('div'); v.className = 'r-win';
    const p = st.players.find(x => x.name === last.name);
    const dot = document.createElement('i'); dot.style.setProperty('--wc', p ? colorOf(p) : '#fff');
    const nm = document.createElement('span'); nm.textContent = last.name;
    v.append(dot, nm); box.append(k, v);
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
    name.onclick = () => { if (running) return; const q = st.players.find(x => x.name === p.name); if (q) { q.out = !q.out; commit(); } };
    const x = document.createElement('button'); x.className = 'r-chip-x'; x.setAttribute('aria-label', 'Supprimer ' + p.name); x.textContent = '×';
    x.onclick = () => { if (running) return; st.players = st.players.filter(q => q.name !== p.name); commit(); };
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
  const shown = Math.max(2, Math.min(st.teams, Math.max(2, n), 8));
  $('rTeamN').textContent = shown;
  $('rSpin').textContent = running ? 'Tirage…' : st.mode === 'solo' ? 'Lancer le tirage' : 'Former les équipes';
  $('rSpin').disabled = running || (st.mode === 'solo' ? n < 1 : n < 2);
}
function renderAll() { if (!running) { drawGrid(); showResult(); } renderPlayers(); renderControls(); }

// ---- actions
$('rAdd').onsubmit = e => {
  e.preventDefault();
  const inp = $('rName'), name = inp.value.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name || running) return;
  if (st.players.length >= MAX) return toast('Maximum ' + MAX + ' joueurs');
  if (st.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast(name + ' est déjà dans la liste');
  st.players.push({ name, out: false });
  inp.value = ''; commit(); buzz(8);
};
document.querySelectorAll('.r-mode-b').forEach(b => b.onclick = () => { if (running || st.mode === b.dataset.mode) return; st.mode = b.dataset.mode; commit(); });
$('rRemove').onchange = e => { if (running) { e.target.checked = st.remove; return; } st.remove = e.target.checked; commit(); };
$('rTeamMinus').onclick = () => { if (running) return; st.teams = Math.max(2, Math.min(st.teams, active().length, 8) - 1); commit(); };
$('rTeamPlus').onclick = () => { if (running) return; st.teams = Math.min(8, Math.max(2, active().length), Math.min(st.teams, 8) + 1); commit(); };
$('rBack').onclick = () => { if (running) return; st.players.forEach(p => p.out = false); commit(); };
$('rClear').onclick = () => { if (running || !confirm('Effacer toute la liste de joueurs, pour tout le monde ?')) return; st = Object.assign(blank(), { mode: st.mode, teams: st.teams, remove: st.remove }); commit(); };

$('rSpin').onclick = () => {
  const list = active(), n = list.length;
  if (running || !n) return;
  const next = clone(st); let seq, w;
  if (st.mode === 'solo') {
    w = rnd(n); seq = makeSeq(w, 26 + rnd(8), n);
    next.last = { type: 'solo', name: list[w].name };
    if (st.remove) next.players.forEach(p => { if (p.name === list[w].name) p.out = true; });
  } else {
    const k = Math.max(2, Math.min(st.teams, n, 8));
    seq = makeSeq(rnd(n), 16, n);
    const teams = Array.from({ length: k }, () => []);
    shuffle(list).forEach((p, idx) => teams[idx % k].push(p.name));
    next.last = { type: 'teams', teams };
  }
  lastDrawId = Date.now().toString(36) + rnd(1e6).toString(36);
  const msg = Object.assign({ k: 'draw', id: lastDrawId, seq, w, s: next });
  if (new TextEncoder().encode(JSON.stringify(msg)).length <= MAX_BYTES)
    live.publish(msg).catch(() => { dirty = true; toast('Pas de connexion : tirage gardé sur ce téléphone'); });
  buzz(10);
  playDraw(seq, next, w, true);
};

setSync('wait');
renderAll();
})();

// ===== Module : roue du hasard =====
// Liste de joueurs enregistrée sur l'appareil (localStorage), tirage individuel ou par équipes.
// Le hasard vient de crypto.getRandomValues (pas de Math.random).
(() => {
const KEY = 'roue_v1';
const COLORS = ['#e9c46a', '#e76f51', '#2a9d8f', '#f4ead5', '#8ecae6', '#c8553d', '#a7c957', '#f2a65a'];
const TEAM_COLORS = ['#e76f51', '#2a9d8f', '#e9c46a', '#8ecae6', '#a7c957', '#c8553d', '#f2a65a', '#b8a1d9'];
const MAX = 40;

let st = load();
let rot = 0, spinning = false;
const svgNS = 'http://www.w3.org/2000/svg';

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

// ---- dessin de la roue
function el(tag, attrs) { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
function drawWheel() {
  const svg = $('rWheel'), list = active(), n = list.length;
  svg.innerHTML = '';
  const g = el('g', { id: 'rRot' }); g.style.transform = 'rotate(' + rot + 'deg)';
  svg.appendChild(g);
  if (!n) {
    g.appendChild(el('circle', { r: 96, fill: 'rgba(255,255,255,.06)', stroke: 'rgba(255,255,255,.25)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    const t = el('text', { y: 52, 'text-anchor': 'middle', class: 'r-empty' }); t.textContent = 'Ajoute des joueurs'; g.appendChild(t);
    return;
  }
  const a = 360 / n;
  list.forEach((p, i) => {
    let color = COLORS[i % COLORS.length];
    if (n > 1 && i === n - 1 && color === COLORS[0]) color = COLORS[2];   // évite deux couleurs identiques côte à côte
    if (n === 1) g.appendChild(el('circle', { r: 96, fill: color }));
    else {
      const t1 = (i * a - 90) * Math.PI / 180, t2 = ((i + 1) * a - 90) * Math.PI / 180;
      const d = `M0 0 L${96 * Math.cos(t1)} ${96 * Math.sin(t1)} A96 96 0 ${a > 180 ? 1 : 0} 1 ${96 * Math.cos(t2)} ${96 * Math.sin(t2)}Z`;
      g.appendChild(el('path', { d, fill: color, stroke: '#14213d', 'stroke-width': .8 }));
    }
    const fs = n > 24 ? 6 : n > 14 ? 7.5 : n > 8 ? 9 : 10.5;
    const label = p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name;
    const t = el('text', { x: 86, y: 0, 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-size': fs, class: 'r-label', transform: `rotate(${(i + .5) * a - 90})` });
    t.textContent = label; g.appendChild(t);
  });
  g.appendChild(el('circle', { r: 96, fill: 'none', stroke: '#14213d', 'stroke-width': 3 }));
}

// ---- tour de roue jusqu'au segment i
function spinTo(i, n, ms) {
  return new Promise(res => {
    const a = 360 / n, center = (i + .5) * a, jitter = (rnd(1000) / 1000 - .5) * a * .6;
    const target = -(center + jitter);
    const cur = ((rot % 360) + 360) % 360;
    let delta = ((target - cur) % 360 + 360) % 360;
    rot += 360 * 5 + delta;
    const g = $('rRot');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduce ? 300 : ms;
    g.style.transition = `transform ${dur}ms cubic-bezier(.12,.7,.1,1)`;
    requestAnimationFrame(() => { g.style.transform = 'rotate(' + rot + 'deg)'; });
    setTimeout(() => { g.style.transition = ''; res(); }, dur + 60);
  });
}

// ---- affichage du résultat
function showResult() {
  const box = $('rResult'), wrap = $('rResultWrap'), last = st.last;
  box.innerHTML = '';
  if (!last) { wrap.classList.remove('open'); return; }
  if (last.type === 'solo') {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = 'Tiré au sort';
    const v = document.createElement('div'); v.className = 'r-win'; v.textContent = last.name;
    box.append(k, v);
  } else {
    const k = document.createElement('div'); k.className = 'r-k'; k.textContent = last.teams.length + ' équipes';
    const grid = document.createElement('div'); grid.className = 'r-teams';
    last.teams.forEach((team, i) => {
      const c = document.createElement('div'); c.className = 'r-team'; c.style.setProperty('--tc', TEAM_COLORS[i % TEAM_COLORS.length]);
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
    const name = document.createElement('button'); name.className = 'r-chip-n'; name.textContent = p.name;
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
  spinning = true; renderControls(); buzz(10);
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
  renderAll(); showResult();
};

renderAll();
showResult();
})();

// ===== Module : Loup-Garou (version meneur, un seul téléphone) =====
// 1. On ajoute les joueurs et on choisit les rôles.
// 2. On se passe le téléphone : chacun découvre son rôle en secret.
// 3. Le téléphone revient au meneur, guidé étape par étape (nuit, matin, vote du village).
// L'appli suit les morts, les potions, les amoureux, le chasseur, et annonce la victoire.
(() => {
const V = $('lgView');
const KEY = 'lg_v1';
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const rnd = n => { const lim = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do crypto.getRandomValues(a); while (a[0] >= lim); return a[0] % n; };
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- rôles ----------
const I = {   // icônes originales
  loup: '<path d="M14 54l6-30 12 10h0l12-10 6 30-18 14z" fill="#7d8bb8"/><path d="M20 24l-4-14 12 12M44 24l4-14-12 12" fill="#7d8bb8"/><circle cx="25" cy="42" r="3.5" fill="#ffcf3f"/><circle cx="39" cy="42" r="3.5" fill="#ffcf3f"/><path d="M28 54l4 4 4-4" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>',
  villageois: '<path d="M12 34L32 16l20 18v24H12z" fill="#c98b4e"/><path d="M8 36L32 14l24 22" fill="none" stroke="#7a4b23" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="26" y="40" width="12" height="18" rx="2" fill="#7a4b23"/>',
  voyante: '<path d="M6 32s10-16 26-16 26 16 26 16-10 16-26 16S6 32 6 32z" fill="#efe6ff"/><circle cx="32" cy="32" r="10" fill="#7c4dff"/><circle cx="32" cy="32" r="4" fill="#1d1238"/><circle cx="35" cy="29" r="2" fill="#fff"/>',
  sorciere: '<path d="M24 12h16v8l8 10v22a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6V30l8-10z" fill="#3ddc97"/><rect x="22" y="8" width="20" height="6" rx="2" fill="#8d6e63"/><path d="M16 38h32v14a6 6 0 0 1-6 6H22a6 6 0 0 1-6-6z" fill="#1fa774"/><circle cx="28" cy="46" r="3" fill="#fff" opacity=".7"/>',
  chasseur: '<circle cx="32" cy="32" r="20" fill="none" stroke="#e5383b" stroke-width="5"/><circle cx="32" cy="32" r="6" fill="#e5383b"/><path d="M32 4v14M32 46v14M4 32h14M46 32h14" stroke="#e5383b" stroke-width="5" stroke-linecap="round"/>',
  cupidon: '<path d="M32 54S10 40 10 25a11 11 0 0 1 22-4 11 11 0 0 1 22 4c0 15-22 29-22 29z" fill="#ff5c8a"/><path d="M8 52L54 12" stroke="#ffcf3f" stroke-width="4" stroke-linecap="round"/><path d="M54 12l-10 2 8 8z" fill="#ffcf3f"/>',
  petite: '<path d="M14 54c0-16 8-26 18-26s18 10 18 26z" fill="#e5383b"/><path d="M18 34c0-12 6-22 14-22s14 10 14 22c-4-6-9-8-14-8s-10 2-14 8z" fill="#c1121f"/><circle cx="32" cy="38" r="8" fill="#f2c9a0"/><circle cx="29" cy="38" r="1.6" fill="#1d1238"/><circle cx="35" cy="38" r="1.6" fill="#1d1238"/>',
};
const icon = (r, cls = '') => `<svg class="lg-ico ${cls}" viewBox="0 0 64 64" aria-hidden="true">${I[r]}</svg>`;
const ROLES = {
  loup: { n: 'Loup-Garou', camp: 'loups', d: 'Chaque nuit, avec les autres loups, tu choisis une victime. Le jour, fais-toi passer pour un villageois.' },
  villageois: { n: 'Villageois', camp: 'village', d: 'Tu n’as pas de pouvoir. Écoute, observe et vote pour éliminer les loups.' },
  voyante: { n: 'Voyante', camp: 'village', d: 'Chaque nuit, tu découvres le rôle d’un joueur de ton choix.' },
  sorciere: { n: 'Sorcière', camp: 'village', d: 'Tu as une potion de vie pour sauver la victime des loups, et une potion de mort pour éliminer quelqu’un. Une seule fois chacune.' },
  chasseur: { n: 'Chasseur', camp: 'village', d: 'Si tu meurs, tu tires une dernière balle et tu emportes un joueur avec toi.' },
  cupidon: { n: 'Cupidon', camp: 'village', d: 'La première nuit, tu désignes deux amoureux. Si l’un meurt, l’autre meurt de chagrin.' },
  petite: { n: 'Petite fille', camp: 'village', d: 'La nuit, tu peux entrouvrir les yeux pour espionner les loups… sans te faire repérer.' },
};
const SPECIAL = ['voyante', 'sorciere', 'chasseur', 'cupidon', 'petite'];
function suggest(n) {
  return { loup: n <= 6 ? 1 : n <= 11 ? 2 : n <= 16 ? 3 : 4, voyante: 1, sorciere: n >= 6 ? 1 : 0, chasseur: n >= 7 ? 1 : 0, cupidon: n >= 8 ? 1 : 0, petite: n >= 9 ? 1 : 0 };
}

// ---------- état ----------
let S = store.get(KEY, null) || { players: [], cfg: null, custom: false, g: null };
const save = () => store.set(KEY, S);
const n = () => S.players.length;
const cfg = () => (S.custom && S.cfg) ? S.cfg : suggest(n());
const nVill = c => n() - Object.values(c).reduce((a, b) => a + b, 0);
const alive = () => S.g.p.map((p, i) => p.alive ? i : -1).filter(i => i >= 0);
const nameOf = i => S.g.p[i].name;
const roleOf = i => S.g.p[i].role;

// ---------- rendu ----------
function render() {
  const g = S.g;
  if (!g) return setup();
  ({ deal, night, morning, hunter, day, verdict, end })[g.phase]();
}

function setup() {
  const c = cfg(), v = nVill(c), ok = n() >= 5 && v >= 0 && c.loup >= 1 && c.loup < n() - c.loup;
  V.innerHTML = `<div class="lg-hero">${icon('loup', 'big')}<div><h2>Loup-Garou</h2><p>Le village se réveille… mais certains ne sont pas ce qu’ils prétendent.</p></div></div>
    <h3 class="lg-h">Joueurs <em>${n()}</em></h3>
    <form class="lg-add" data-f="add" autocomplete="off"><input name="n" maxlength="16" placeholder="Prénom" enterkeyhint="done"><button>Ajouter</button></form>
    <div class="lg-chips">${S.players.map((p, i) => `<span class="lg-chip">${esc(p)}<button data-a="del" data-i="${i}" aria-label="Supprimer">×</button></span>`).join('') || '<p class="lg-muted">Au moins 5 joueurs (dont le meneur ne fait pas partie).</p>'}</div>
    <h3 class="lg-h">Rôles ${S.custom ? '<button class="lg-link" data-a="auto">revenir aux rôles conseillés</button>' : '<small>conseillés pour ' + n() + ' joueurs</small>'}</h3>
    <div class="lg-roles">${['loup', ...SPECIAL].map(r => `<div class="lg-role">${icon(r)}<span>${ROLES[r].n}</span><div class="lg-step"><button data-a="r-" data-r="${r}">−</button><b>${c[r]}</b><button data-a="r+" data-r="${r}">+</button></div></div>`).join('')}
      <div class="lg-role">${icon('villageois')}<span>Villageois</span><div class="lg-step"><b>${Math.max(0, v)}</b></div></div></div>
    ${n() >= 5 && !ok ? `<p class="lg-warn">${v < 0 ? 'Trop de rôles pour le nombre de joueurs.' : 'Il faut au moins 1 loup, et moins de loups que de villageois.'}</p>` : ''}
    <button class="lg-go" data-a="start"${ok ? '' : ' disabled'}>Distribuer les rôles</button>
    <details class="lg-rules"><summary>Les rôles</summary>${['loup', 'villageois', ...SPECIAL].map(r => `<p>${icon(r, 'sm')}<b>${ROLES[r].n}</b> : ${ROLES[r].d}</p>`).join('')}</details>`;
}

function start() {
  const c = cfg(), deck = [];
  Object.entries(c).forEach(([r, k]) => { for (let i = 0; i < k; i++) deck.push(r); });
  while (deck.length < n()) deck.push('villageois');
  const roles = shuffle(deck);
  S.g = { phase: 'deal', di: 0, shown: false, night: 1, step: 0, p: S.players.map((name, i) => ({ name, role: roles[i], alive: true })),
    lovers: null, life: true, poison: true, victim: null, saved: false, poisoned: null, seen: null, log: [], dead: [], queue: [], after: null, winner: null };
  save(); render();
}

function deal() {
  const g = S.g, p = g.p[g.di];
  if (!g.shown) {
    V.innerHTML = `<p class="lg-k">Distribution ${g.di + 1} / ${g.p.length}</p><div class="lg-pass"><span>Passe le téléphone à</span><b>${esc(p.name)}</b></div>
      <button class="lg-go" data-a="show">C’est moi, voir mon rôle</button><button class="lg-link" data-a="quit">Arrêter la partie</button>`;
  } else {
    const r = ROLES[p.role];
    V.innerHTML = `<p class="lg-k">${esc(p.name)}, ton rôle secret</p><div class="lg-card lg-c-${r.camp}">${icon(p.role, 'big')}<b>${r.n}</b><p>${r.d}</p></div>
      <button class="lg-go" data-a="hide">J’ai retenu, cacher</button>`;
  }
}

// ----- la nuit : liste des étapes selon les rôles encore en vie -----
const has = r => S.g.p.some(p => p.alive && p.role === r);
function steps() {
  const g = S.g, s = [];
  if (g.night === 1 && S.g.p.some(p => p.role === 'cupidon')) s.push('cupidon');
  if (has('voyante')) s.push('voyante');
  s.push('loups');
  if (has('sorciere') && (g.life || g.poison)) s.push('sorciere');
  return s;
}
function pick(list, act, sel, label) {
  return `<div class="lg-pick">${list.map(i => `<button data-a="${act}" data-i="${i}" class="${(Array.isArray(sel) ? sel.includes(i) : sel === i) ? 'on' : ''}">${esc(nameOf(i))}</button>`).join('')}</div>${label || ''}`;
}
function night() {
  const g = S.g, st = steps(), cur = st[g.step];
  const head = `<div class="lg-night"><span>Nuit ${g.night}</span><b>Le village s’endort…</b></div><div class="lg-dots">${st.map((x, k) => `<i class="${k < g.step ? 'done' : k === g.step ? 'on' : ''}"></i>`).join('')}</div>`;
  let body = '';
  if (cur === 'cupidon') {
    const sel = g.tmp || [];
    body = `<div class="lg-stepbox">${icon('cupidon')}<div><b>Cupidon se réveille</b><p>« Cupidon, désigne les deux amoureux. »</p></div></div>
      ${pick(alive(), 'tmp2', sel)}<button class="lg-go" data-a="cupi-ok"${sel.length === 2 ? '' : ' disabled'}>Valider les amoureux</button>
      <p class="lg-muted">Puis : « Les amoureux, ouvrez les yeux et reconnaissez-vous. »</p>`;
  } else if (cur === 'voyante') {
    body = `<div class="lg-stepbox">${icon('voyante')}<div><b>La Voyante se réveille</b><p>« Voyante, de qui veux-tu connaître le rôle ? »</p></div></div>
      ${pick(alive().filter(i => roleOf(i) !== 'voyante'), 'seer', g.seen)}
      ${g.seen !== null ? `<div class="lg-reveal">${icon(roleOf(g.seen), 'sm')}<span>${esc(nameOf(g.seen))} est <b>${ROLES[roleOf(g.seen)].n}</b></span></div><p class="lg-muted">Montre-lui la carte du doigt, sans parler.</p><button class="lg-go" data-a="next">Suivant</button>` : ''}`;
  } else if (cur === 'loups') {
    body = `<div class="lg-stepbox">${icon('loup')}<div><b>Les Loups-Garous se réveillent</b><p>« Loups-Garous, choisissez votre victime. »</p></div></div>
      ${pick(alive().filter(i => roleOf(i) !== 'loup'), 'wolf', g.victim)}
      <button class="lg-go" data-a="next"${g.victim !== null ? '' : ' disabled'}>Les loups se rendorment</button>`;
  } else if (cur === 'sorciere') {
    const v = g.victim;
    body = `<div class="lg-stepbox">${icon('sorciere')}<div><b>La Sorcière se réveille</b><p>« Sorcière, voici la victime des loups. »</p></div></div>
      <div class="lg-reveal lg-bad"><span>Victime : <b>${esc(nameOf(v))}</b></span></div>
      ${g.life ? `<button class="lg-opt${g.saved ? ' on' : ''}" data-a="save">${icon('sorciere', 'sm')} Potion de vie : ${g.saved ? 'elle la sauve' : 'la sauver ?'}</button>` : '<p class="lg-muted">Potion de vie déjà utilisée.</p>'}
      ${g.poison ? `<p class="lg-label">Potion de mort : tuer quelqu’un ? (facultatif)</p>${pick(alive().filter(i => roleOf(i) !== 'sorciere'), 'poison', g.poisoned)}` : '<p class="lg-muted">Potion de mort déjà utilisée.</p>'}
      <button class="lg-go" data-a="next">La Sorcière se rendort</button>`;
  }
  V.innerHTML = head + body + `<button class="lg-link" data-a="quit">Arrêter la partie</button>`;
}
function endNight() {
  const g = S.g, deaths = [];
  if (g.victim !== null && !g.saved) deaths.push(g.victim);
  if (g.saved) g.life = false;
  if (g.poisoned !== null) { deaths.push(g.poisoned); g.poison = false; }
  g.victim = null; g.saved = false; g.poisoned = null; g.seen = null; g.tmp = null; g.step = 0;
  g.dead = []; g.queue = [...new Set(deaths)]; g.after = 'day';
  resolveDeaths();
}
// applique les morts en file (amoureux, chasseur), puis passe à la suite
function resolveDeaths() {
  const g = S.g;
  while (g.queue.length) {
    const i = g.queue.shift();
    if (!g.p[i].alive) continue;
    g.p[i].alive = false; g.dead.push(i);
    if (g.lovers && g.lovers.includes(i)) { const o = g.lovers.find(x => x !== i); if (g.p[o].alive) g.queue.push(o); }
    if (g.p[i].role === 'chasseur') { g.hunterFrom = g.phase; g.phase = 'hunter'; g.hunterI = i; save(); return render(); }
  }
  const w = winner(); if (w) { g.winner = w; g.phase = 'end'; save(); return render(); }
  g.phase = g.after === 'day' ? 'morning' : g.dead.length ? 'verdict' : 'night';
  if (g.phase === 'night') { g.night++; g.step = 0; }
  save(); render();
}
function winner() {
  const g = S.g, al = alive(), wolves = al.filter(i => roleOf(i) === 'loup').length;
  if (g.lovers && al.length === 2 && al.every(i => g.lovers.includes(i)) && roleOf(g.lovers[0]) === 'loup' !== (roleOf(g.lovers[1]) === 'loup')) return 'amoureux';
  if (!al.length) return 'personne';
  if (wolves === 0) return 'village';
  if (wolves >= al.length - wolves) return 'loups';
  return null;
}
function morning() {
  const g = S.g;
  V.innerHTML = `<div class="lg-day"><span>Jour ${g.night}</span><b>Le village se réveille</b></div>
    ${g.dead.length ? g.dead.map(i => `<div class="lg-death">${icon(roleOf(i), 'sm')}<span><b>${esc(nameOf(i))}</b> ne se réveille pas. C’était : <b>${ROLES[roleOf(i)].n}</b></span></div>`).join('') : '<div class="lg-death lg-none">Personne n’est mort cette nuit.</div>'}
    <button class="lg-go" data-a="to-day">Passer au débat et au vote</button>`;
}
function verdict() {
  const g = S.g;
  V.innerHTML = `<div class="lg-day"><span>Jour ${g.night}</span><b>Le village a tranché</b></div>
    ${g.dead.map(i => `<div class="lg-death">${icon(roleOf(i), 'sm')}<span><b>${esc(nameOf(i))}</b> quitte le village. C\u2019était : <b>${ROLES[roleOf(i)].n}</b></span></div>`).join('')}
    <button class="lg-go" data-a="to-night">La nuit tombe</button>`;
}
function hunter() {
  const g = S.g;
  V.innerHTML = `<div class="lg-stepbox">${icon('chasseur')}<div><b>${esc(nameOf(g.hunterI))} était le Chasseur !</b><p>« Chasseur, avant de mourir, qui emportes-tu avec toi ? »</p></div></div>
    ${pick(alive(), 'shoot', null)}`;
}
function day() {
  const g = S.g;
  V.innerHTML = `<div class="lg-day"><span>Jour ${g.night}</span><b>Le village vote</b></div>
    <p class="lg-muted">Débattez, puis votez à main levée. Touchez le joueur éliminé.</p>
    ${pick(alive(), 'lynch', null)}
    <button class="lg-link" data-a="nolynch">Égalité : personne n’est éliminé</button>
    ${statusHTML()}`;
}
function statusHTML() {
  const g = S.g;
  return `<details class="lg-rules"><summary>Récapitulatif (meneur)</summary><ul class="lg-list">${g.p.map((p, i) => `<li class="${p.alive ? '' : 'out'}">${icon(p.role, 'sm')}<span>${esc(p.name)}</span><b>${ROLES[p.role].n}${g.lovers && g.lovers.includes(i) ? ' ♥' : ''}</b></li>`).join('')}</ul>
    <p class="lg-muted">Potions : vie ${g.life ? 'disponible' : 'utilisée'}, mort ${g.poison ? 'disponible' : 'utilisée'}.</p></details>`;
}
function end() {
  const g = S.g, t = { village: 'Le village gagne', loups: 'Les Loups-Garous gagnent', amoureux: 'Les amoureux gagnent', personne: 'Personne ne survit' }[g.winner];
  const sub = { village: 'Tous les loups ont été éliminés.', loups: 'Les loups sont aussi nombreux que les villageois.', amoureux: 'Un loup et un villageois, seuls contre tous.', personne: 'Le village est désert…' }[g.winner];
  V.innerHTML = `<div class="lg-end lg-e-${g.winner}">${icon(g.winner === 'loups' ? 'loup' : g.winner === 'amoureux' ? 'cupidon' : 'villageois', 'big')}<span>Fin de partie</span><b>${t}</b><em>${sub}</em></div>
    <ul class="lg-list">${g.p.map((p, i) => `<li class="${p.alive ? '' : 'out'}">${icon(p.role, 'sm')}<span>${esc(p.name)}</span><b>${ROLES[p.role].n}${g.lovers && g.lovers.includes(i) ? ' ♥' : ''}</b></li>`).join('')}</ul>
    <button class="lg-go" data-a="start">Rejouer avec les mêmes joueurs</button><button class="lg-link" data-a="quit-end">Modifier les joueurs</button>`;
}

// ---------- actions ----------
V.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
  const a = b.dataset.a, i = +b.dataset.i, g = S.g;
  if (a === 'del') { S.players.splice(i, 1); save(); return render(); }
  if (a === 'r+' || a === 'r-') { const c = Object.assign({}, cfg()); const r = b.dataset.r; c[r] = Math.max(r === 'loup' ? 1 : 0, Math.min(r === 'loup' ? 6 : 1, c[r] + (a === 'r+' ? 1 : -1))); S.cfg = c; S.custom = true; save(); return render(); }
  if (a === 'auto') { S.custom = false; S.cfg = null; save(); return render(); }
  if (a === 'start') return start();
  if (a === 'quit' || a === 'quit-end') { if (a === 'quit' && !confirm('Arrêter la partie en cours ?')) return; S.g = null; save(); return render(); }
  if (a === 'show') { g.shown = true; save(); return render(); }
  if (a === 'hide') { g.shown = false; g.di++; if (g.di >= g.p.length) { g.phase = 'night'; g.step = 0; } save(); return render(); }
  if (a === 'tmp2') { const s = g.tmp || []; g.tmp = s.includes(i) ? s.filter(x => x !== i) : s.length < 2 ? [...s, i] : [s[1], i]; save(); return render(); }
  if (a === 'cupi-ok') { g.lovers = g.tmp; g.tmp = null; g.step++; save(); return render(); }
  if (a === 'seer') { g.seen = i; save(); return render(); }
  if (a === 'wolf') { g.victim = i; save(); return render(); }
  if (a === 'save') { g.saved = !g.saved; save(); return render(); }
  if (a === 'poison') { g.poisoned = g.poisoned === i ? null : i; save(); return render(); }
  if (a === 'next') { g.step++; if (g.step >= steps().length) return endNight(); save(); return render(); }
  if (a === 'to-night') { g.phase = 'night'; g.night++; g.step = 0; save(); return render(); }
  if (a === 'to-day') { g.phase = 'day'; save(); return render(); }
  if (a === 'shoot') { g.phase = g.hunterFrom === 'day' ? 'day' : 'night'; g.queue.unshift(i); g.hunterI = null; return resolveDeaths(); }
  if (a === 'lynch') { if (!confirm('Éliminer ' + nameOf(i) + ' ?')) return; g.dead = []; g.queue = [i]; g.after = 'night'; return resolveDeaths(); }
  if (a === 'nolynch') { g.dead = []; g.queue = []; g.after = 'night'; return resolveDeaths(); }
});
V.addEventListener('submit', e => {
  e.preventDefault();
  const v = e.target.n.value.trim().replace(/\s+/g, ' ').slice(0, 16); if (!v) return;
  if (S.players.length >= 20) return toast('Maximum 20 joueurs');
  if (S.players.some(p => p.toLowerCase() === v.toLowerCase())) return toast(v + ' est déjà dans la liste');
  S.players.push(v); save(); render(); V.querySelector('[data-f=add] input')?.focus();
});
render();
})();

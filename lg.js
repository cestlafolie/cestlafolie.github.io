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
const I = {   // silhouettes d'une seule couleur (currentColor), style tampon
  loup: '<path d="M10 56l5-34 9 9 8-17 8 17 9-9 5 34-22 6z"/><path d="M24 40h5l-2 4zM35 40h5l-3 4z" fill="var(--lg-bg)"/>',
  villageois: '<path d="M8 32L32 12l24 20h-6v24H14V32z"/><rect x="27" y="40" width="10" height="16" fill="var(--lg-bg)"/>',
  voyante: '<path d="M4 32s11-16 28-16 28 16 28 16-11 16-28 16S4 32 4 32z"/><circle cx="32" cy="32" r="9" fill="var(--lg-bg)"/><circle cx="32" cy="32" r="4.5"/>',
  sorciere: '<path d="M25 8h14v9l9 12v25a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V29l9-12z"/><path d="M20 36h24" stroke="var(--lg-bg)" stroke-width="3"/>',
  chasseur: '<path d="M32 6v12M32 46v12M6 32h12M46 32h12" stroke="currentColor" stroke-width="5"/><circle cx="32" cy="32" r="17" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="32" cy="32" r="5"/>',
  cupidon: '<path d="M32 55S9 40 9 24a11 11 0 0 1 23-5 11 11 0 0 1 23 5c0 16-23 31-23 31z"/><path d="M6 50L50 10" stroke="var(--lg-bg)" stroke-width="3"/>',
  petite: '<path d="M12 58c0-18 9-30 20-30s20 12 20 30z"/><path d="M16 36c0-14 7-24 16-24s16 10 16 24c-5-6-10-8-16-8s-11 2-16 8z"/><circle cx="32" cy="40" r="7" fill="var(--lg-bg)"/>',
};
const icon = (r, cls = '') => `<svg class="lg-ico lg-i-${r} ${cls}" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${I[r]}</svg>`;
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
if (!('mode' in S)) S.mode = null;   // null = choix, 'local' = un téléphone, 'host' = meneur en ligne, 'player' = joueur en ligne
const save = () => store.set(KEY, S);
const n = () => S.players.length;
const cfg = () => (S.custom && S.cfg) ? S.cfg : suggest(n());
const nVill = c => n() - Object.values(c).reduce((a, b) => a + b, 0);
const alive = () => S.g.p.map((p, i) => p.alive ? i : -1).filter(i => i >= 0);
const nameOf = i => S.g.p[i].name;
const roleOf = i => S.g.p[i].role;

// ---------- rendu ----------
function render() {
  if (!S.mode) return home();
  if (S.mode === 'player') return playerView();
  const g = S.g;
  if (!g) return setup();
  ({ deal, cards, night, morning, hunter, day, verdict, end })[g.phase]();
  if (S.mode === 'host') pushStatus();
}
function home() {
  V.innerHTML = `<div class="lg-hero">${icon('loup', 'big')}<div><h2>Loup-Garou</h2><p>Le village se réveille… mais certains ne sont pas ce qu\u2019ils prétendent.</p></div></div>
    <button class="lg-mode" data-a="m-host"><b>Je suis le meneur</b><span>Chaque joueur reçoit sa carte sur son téléphone. Tu vois toutes les cartes sur le tien.</span></button>
    <button class="lg-mode" data-a="m-player"><b>Je suis joueur</b><span>Rejoins la partie du meneur avec son code pour recevoir ta carte.</span></button>
    <button class="lg-mode lg-mode-alt" data-a="m-local"><b>Un seul téléphone</b><span>On se passe le téléphone pour découvrir son rôle.</span></button>`;
}

function setup() {
  const host = S.mode === 'host';
  if (host) S.players = H.players.map(p => p.name);   // d'abord compter les joueurs connectés
  const c = cfg(), v = nVill(c), ok = n() >= 5 && v >= 0 && c.loup >= 1 && c.loup < n() - c.loup;
  const url = host ? location.origin + location.pathname + '#lg/' + H.code : '';
  V.innerHTML = `<button class="lg-back" data-a="m-back">‹ Changer de mode</button>
    ${host ? `<p class="lg-net ${H.net || ''}"><i></i>${H.net === 'on' ? 'Connecté' : 'Connexion…'}</p>
    <div class="lg-code"><span>Code de la partie</span><b>${esc(H.code)}</b><button data-a="share" data-url="${esc(url)}">Inviter</button></div>
    <h3 class="lg-h">Joueurs connectés <em>${n()}</em></h3>
    <div class="lg-chips">${H.players.map(p => `<span class="lg-chip lg-chip-on">${esc(p.name)}</span>`).join('') || '<p class="lg-muted">Les joueurs tapent ce code dans « Je suis joueur ». Au moins 5 joueurs.</p>'}</div>` : `<div class="lg-hero">${icon('loup', 'big')}<div><h2>Loup-Garou</h2><p>Le village se réveille… mais certains ne sont pas ce qu’ils prétendent.</p></div></div>
    <h3 class="lg-h">Joueurs <em>${n()}</em></h3>
    <form class="lg-add" data-f="add" autocomplete="off"><input name="n" maxlength="16" placeholder="Prénom" enterkeyhint="done"><button>Ajouter</button></form>
    <div class="lg-chips">${S.players.map((p, i) => `<span class="lg-chip">${esc(p)}<button data-a="del" data-i="${i}" aria-label="Supprimer">×</button></span>`).join('') || '<p class="lg-muted">Au moins 5 joueurs (dont le meneur ne fait pas partie).</p>'}</div>`}
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
  if (S.mode === 'host') return hostStart(roles);
  S.g = { phase: 'deal', di: 0, shown: false, night: 1, step: 0, p: S.players.map((name, i) => ({ name, role: roles[i], alive: true })),
    lovers: null, life: true, poison: true, victim: null, saved: false, poisoned: null, seen: null, log: [], dead: [], queue: [], after: null, winner: null };
  save(); render();
}

function newGame(names, roles, phase) {
  return { phase, di: 0, shown: false, night: 1, step: 0, p: names.map((name, i) => ({ name, role: roles[i], alive: true })),
    lovers: null, life: true, poison: true, victim: null, saved: false, poisoned: null, seen: null, log: [], dead: [], queue: [], after: null, winner: null };
}
function cards() {
  const g = S.g;
  V.innerHTML = `<div class="lg-night"><span>Avant la première nuit</span><b>Les cartes des joueurs</b></div>
    <p class="lg-muted">Chaque joueur voit sa carte sur son téléphone. Toi, tu les vois toutes.</p>
    <div class="lg-cards">${g.p.map(p => `<div class="lg-mini lg-c-${ROLES[p.role].camp}">${icon(p.role)}<b>${esc(p.name)}</b><span>${ROLES[p.role].n}</span></div>`).join('')}</div>
    <button class="lg-go" data-a="to-night1">Commencer la nuit</button><button class="lg-link" data-a="quit">Arrêter la partie</button>`;
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
  return `<details class="lg-rules"${S.mode === 'host' ? ' open' : ''}><summary>Les cartes (meneur)</summary><ul class="lg-list">${g.p.map((p, i) => `<li class="${p.alive ? '' : 'out'}">${icon(p.role, 'sm')}<span>${esc(p.name)}</span><b>${ROLES[p.role].n}${g.lovers && g.lovers.includes(i) ? ' ♥' : ''}</b></li>`).join('')}</ul>
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
  if (a === 'quit' || a === 'quit-end') { if (a === 'quit' && !confirm('Arrêter la partie en cours ?')) return; S.g = null; save(); if (S.mode === 'host') { H.lastSt = ''; H.chan?.publish({ k: 'lobby' }).catch(() => {}); } return render(); }
  if (a === 'show') { g.shown = true; save(); return render(); }
  if (a === 'hide') { g.shown = false; g.di++; if (g.di >= g.p.length) { g.phase = 'night'; g.step = 0; } save(); return render(); }
  if (a === 'tmp2') { const s = g.tmp || []; g.tmp = s.includes(i) ? s.filter(x => x !== i) : s.length < 2 ? [...s, i] : [s[1], i]; save(); return render(); }
  if (a === 'cupi-ok') { g.lovers = g.tmp; g.tmp = null; g.step++; save(); return render(); }
  if (a === 'seer') { g.seen = i; save(); return render(); }
  if (a === 'wolf') { g.victim = i; save(); return render(); }
  if (a === 'save') { g.saved = !g.saved; save(); return render(); }
  if (a === 'poison') { g.poisoned = g.poisoned === i ? null : i; save(); return render(); }
  if (a === 'next') { g.step++; if (g.step >= steps().length) return endNight(); save(); return render(); }
  if (a === 'to-night1') { g.phase = 'night'; g.step = 0; save(); return render(); }
  if (a === 'm-local') { S.mode = 'local'; save(); return render(); }
  if (a === 'm-host') return hostCreate();
  if (a === 'm-player') { S.mode = 'player'; save(); return render(); }
  if (a === 'm-back') { if (S.mode === 'host') hostLeave(); S.mode = null; save(); return render(); }
  if (a === 'share') { const url = b.dataset.url; if (navigator.share) navigator.share({ title: 'Loup-Garou', text: 'Rejoins ma partie de Loup-Garou : code ' + H.code, url }).catch(() => {}); else navigator.clipboard?.writeText(url).then(() => toast('Lien copié')).catch(() => toast(url)); return; }
  if (a === 'pl-show') { P.shown = !P.shown; return render(); }
  if (a === 'pl-leave') { if (!confirm('Quitter la partie ?')) return; playerLeave(); return; }
  if (a === 'to-night') { g.phase = 'night'; g.night++; g.step = 0; save(); return render(); }
  if (a === 'to-day') { g.phase = 'day'; save(); return render(); }
  if (a === 'shoot') { g.phase = g.hunterFrom === 'day' ? 'day' : 'night'; g.queue.unshift(i); g.hunterI = null; return resolveDeaths(); }
  if (a === 'lynch') { if (!confirm('Éliminer ' + nameOf(i) + ' ?')) return; g.dead = []; g.queue = [i]; g.after = 'night'; return resolveDeaths(); }
  if (a === 'nolynch') { g.dead = []; g.queue = []; g.after = 'night'; return resolveDeaths(); }
});
V.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.dataset.f === 'join') return playerJoin(e.target.code.value, e.target.name.value);
  const v = e.target.n.value.trim().replace(/\s+/g, ' ').slice(0, 16); if (!v) return;
  if (S.players.length >= 20) return toast('Maximum 20 joueurs');
  if (S.players.some(p => p.toLowerCase() === v.toLowerCase())) return toast(v + ' est déjà dans la liste');
  S.players.push(v); save(); render(); V.querySelector('[data-f=add] input')?.focus();
});

// =====================================================================
// EN LIGNE : le meneur crée une partie, chaque joueur reçoit sa carte (chiffrée pour lui seul)
// =====================================================================
const topic = code => 'https://ntfy.sh/cestlafolie-lg-' + code.toLowerCase() + '-r7t2w9';
const CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
const enc = x => new TextEncoder().encode(x);
async function keys() { const k = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']); return { priv: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64(await crypto.subtle.exportKey('raw', k.publicKey)) }; }
async function shared(priv, pub) {
  const a = await crypto.subtle.importKey('jwk', priv, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
  const b = await crypto.subtle.importKey('raw', unb64(pub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return crypto.subtle.deriveKey({ name: 'ECDH', public: b }, a, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(priv, pub, obj) { const k = await shared(priv, pub), iv = crypto.getRandomValues(new Uint8Array(12)); return { iv: b64(iv), ct: b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc(JSON.stringify(obj)))) }; }
async function unseal(priv, pub, box) { const k = await shared(priv, pub); return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.ct)))); }

// ----- meneur -----
const H = { code: null, players: [], chan: null, net: null, lastSt: '' };
async function hostCreate() {
  let o = S.online;
  if (!o || !o.priv) { const k = await keys(); let c = ''; for (let i = 0; i < 4; i++) c += CODE[rnd(CODE.length)]; o = { code: c, priv: k.priv, pub: k.pub }; }
  S.online = o; S.mode = 'host'; save(); hostConnect();
}
function hostConnect() {
  H.code = S.online.code; H.players = []; if (H.chan) H.chan.close();
  H.chan = liveTopic(topic(H.code), {
    onStatus: st => { H.net = st; if (!S.g) render(); },
    onReady: () => { H.ready = true; H.lastSt = ''; render(); },
    onMessage: d => {
      if (d.k === 'join' && typeof d.pid === 'string' && typeof d.name === 'string' && typeof d.pub === 'string') {
        const p = H.players.find(x => x.pid === d.pid);
        if (p) { p.name = d.name.slice(0, 16); p.pub = d.pub; } else if (H.players.length < 20) H.players.push({ pid: d.pid, name: d.name.slice(0, 16), pub: d.pub });
        if (S.g && H.ready) { H.lastSt = ''; pushStatus(); }   // un joueur qui revient reçoit l'état actuel
        if (!S.g) render();
      } else if (d.k === 'leave') { H.players = H.players.filter(x => x.pid !== d.pid); if (!S.g) render(); }
    },
  });
}
function hostLeave() { if (H.chan) H.chan.close(); H.chan = null; S.online = null; S.g = null; }
async function hostStart(roles) {
  const pl = H.players.slice(), gid = Date.now().toString(36) + rnd(1e6).toString(36), box = {};
  for (let i = 0; i < pl.length; i++) box[pl[i].pid] = await seal(S.online.priv, pl[i].pub, { role: roles[i] });
  const msg = { k: 'start', gid, hostPub: S.online.pub, box, names: pl.map(p => p.name) };
  if (enc(JSON.stringify(msg)).length > 3900) return toast('Trop de joueurs pour une partie en ligne');
  try { await H.chan.publish(msg); } catch { return toast('Pas de connexion, réessaie'); }
  S.g = newGame(pl.map(p => p.name), roles, 'cards'); S.g.gid = gid; S.g.pids = pl.map(p => p.pid);
  H.lastSt = ''; save(); render();
}
let stT = null;
function pushStatus() {   // les joueurs voient la phase et qui est encore en vie (jamais les rôles des vivants)
  const g = S.g; if (!g || !H.chan || !g.gid) return;
  const phaseTxt = g.phase === 'night' ? 'Nuit ' + g.night + ' : fermez les yeux' : g.phase === 'cards' ? 'Découvrez votre carte' : g.phase === 'end' ? 'Fin de partie' : 'Jour ' + g.night;
  const st = { k: 'st', gid: g.gid, phase: phaseTxt, alive: g.p.map(p => p.alive), dead: g.p.map(p => p.alive ? null : p.role), winner: g.winner || null, roles: g.phase === 'end' ? g.p.map(p => p.role) : null };
  const sig = JSON.stringify(st); if (sig === H.lastSt) return; H.lastSt = sig;
  clearTimeout(stT); stT = setTimeout(() => H.chan.publish(st).catch(() => {}), 150);
}

// ----- joueur -----
const P = { code: null, chan: null, net: null, card: null, st: null, names: null, shown: false, gid: null };
function playerView() {
  const me = store.get('lg_me', null);
  if (!me || !P.chan) {
    const code = (decodeURIComponent(location.hash.slice(1)).split('/')[1] || (me && me.code) || '').toUpperCase().slice(0, 4);
    V.innerHTML = `<button class="lg-back" data-a="m-back">‹ Changer de mode</button>
      <h3 class="lg-h">Rejoindre la partie</h3>
      <form class="lg-form" data-f="join" autocomplete="off"><input name="code" maxlength="4" placeholder="CODE" value="${esc(code)}" autocapitalize="characters" class="lg-code-in"><input name="name" maxlength="16" placeholder="Ton prénom" value="${esc((me && me.name) || store.get('mw_name', ''))}"><button class="lg-go">Rejoindre</button></form>`;
    return;
  }
  const net = `<p class="lg-net ${P.net || ''}"><i></i>${P.net === 'on' ? 'Connecté' : 'Connexion…'} · partie ${esc(P.code)}</p>`;
  if (!P.card) { V.innerHTML = net + `<div class="lg-pass"><span>Bienvenue ${esc(me.name)}</span><b>En attente…</b></div><p class="lg-muted" style="text-align:center">Le meneur va distribuer les cartes.</p><button class="lg-link" data-a="pl-leave">Quitter la partie</button>`; return; }
  const r = ROLES[P.card.role], st = P.st, myIdx = P.names ? P.names.indexOf(me.name) : -1, dead = st && myIdx >= 0 && st.alive && !st.alive[myIdx];
  V.innerHTML = net + (st ? `<div class="${/^Nuit/.test(st.phase) ? 'lg-night' : 'lg-day'}"><span>${st.winner ? 'Fin de partie' : 'En cours'}</span><b>${esc(st.winner ? ({ village: 'Le village gagne', loups: 'Les Loups-Garous gagnent', amoureux: 'Les amoureux gagnent', personne: 'Personne ne survit' })[st.winner] : st.phase)}</b></div>` : '') +
    (dead ? `<div class="lg-death">${icon(P.card.role, 'sm')}<span>Tu es mort. Ne dis plus rien !</span></div>` : '') +
    `<button class="lg-cardbtn" data-a="pl-show">${P.shown ? `<div class="lg-card lg-c-${r.camp}">${icon(P.card.role, 'big')}<b>${r.n}</b><p>${r.d}</p></div><span>Toucher pour cacher</span>` : `<div class="lg-back-card">${icon('loup', 'big')}<b>Ta carte</b></div><span>Toucher pour voir ton rôle (sans que les autres regardent)</span>`}</button>` +
    (st && P.names ? `<details class="lg-rules"><summary>Le village</summary><ul class="lg-list">${P.names.map((nm, i) => `<li class="${st.alive[i] ? '' : 'out'}">${st.dead[i] || (st.roles && st.roles[i]) ? icon((st.roles || st.dead)[i], 'sm') : ''}<span>${esc(nm)}</span><b>${st.roles ? ROLES[st.roles[i]].n : st.dead[i] ? ROLES[st.dead[i]].n : 'en vie'}</b></li>`).join('')}</ul></details>` : '') +
    `<button class="lg-link" data-a="pl-leave">Quitter la partie</button>`;
}
async function playerJoin(code, name) {
  code = String(code).toUpperCase().replace(/[^A-Z0-9]/g, ''); name = String(name).trim().replace(/\s+/g, ' ').slice(0, 16);
  if (code.length !== 4) return toast('Le code fait 4 caractères'); if (!name) return toast('Indique ton prénom');
  let me = store.get('lg_me', null);
  if (!me || me.code !== code || !me.priv) { const k = await keys(); me = { code, pid: rnd(1e9).toString(36) + rnd(1e9).toString(36), priv: k.priv, pub: k.pub }; }
  me.name = name; store.set('lg_me', me); store.set('mw_name', name);
  P.code = code; P.card = null; P.st = null; P.gid = null; if (P.chan) P.chan.close();
  P.chan = liveTopic(topic(code), {
    onStatus: st => { P.net = st; render(); },
    onReady: () => { P.chan.publish({ k: 'join', pid: me.pid, name: me.name, pub: me.pub }).catch(() => {}); render(); },
    onMessage: d => {
      if (d.k === 'start' && d.box && d.box[me.pid]) {
        P.gid = d.gid; P.names = d.names; P.st = null; P.shown = false;
        unseal(me.priv, d.hostPub, d.box[me.pid]).then(x => { if (P.gid === d.gid) { P.card = x; buzz([15, 40, 15]); render(); } }).catch(() => toast('Impossible de lire ta carte'));
      } else if (d.k === 'st' && d.gid === P.gid) { P.st = d; render(); }
      else if (d.k === 'lobby') { P.card = null; P.st = null; P.gid = null; render(); }
    },
  });
  if (location.hash.startsWith('#lg')) history.replaceState(null, '', '#lg/' + code);
  render();
}
function playerLeave() {
  const me = store.get('lg_me', null);
  if (P.chan && me) P.chan.publish({ k: 'leave', pid: me.pid }).catch(() => {});
  if (P.chan) P.chan.close(); P.chan = null; P.card = null; store.set('lg_me', null);
  S.mode = null; save(); render();
}

// démarrage : lien d'invitation, ou reprise
{
  const hp = decodeURIComponent(location.hash.slice(1)).split('/');
  const me = store.get('lg_me', null);
  if (hp[0] === 'lg' && /^[A-Z0-9]{4}$/i.test(hp[1] || '')) { S.mode = 'player'; save(); if (me && me.name && me.code === hp[1].toUpperCase()) playerJoin(me.code, me.name); }
  else if (S.mode === 'player' && me && me.name) playerJoin(me.code, me.name);
  else if (S.mode === 'host' && S.online) hostConnect();
}
render();
})();
